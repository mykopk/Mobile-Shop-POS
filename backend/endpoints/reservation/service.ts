import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { nextNumber } from "../../core/lib/numbering";
import type { HoldType, Prisma, ReservationStatus } from "../../generated/prisma/client";
import type { CreateReservationInput } from "./schemas";

const includeReservation = {
  contact: true,
  user: { select: { id: true, name: true } },
  items: {
    include: {
      product: { include: { brand: true } },
      unit: true,
    },
  },
  sale: { select: { id: true, number: true } },
} as const;

export async function createReservation(input: CreateReservationInput, userId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
  if (!contact) throw new ApiError(404, "contact.not_found", "Contact not found");

  const products = new Map<string, { id: string }>();
  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new ApiError(404, "product.not_found", "Product not found");
    products.set(product.id, product);
  }

  const items = input.items.map((item) => {
    const total = item.unitId
      ? item.unitPrice - item.discount
      : (item.unitPrice - item.discount) * item.quantity;
    return { ...item, total };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - input.discount;
  if (total < 0) throw new ApiError(400, "reservation.negative_total", "Total cannot be negative");
  if (input.advance > total + 0.001) {
    throw new ApiError(400, "reservation.advance_exceeds_total", "Advance cannot exceed the total");
  }

  const number = await nextNumber(() => prisma.reservation.findMany({ select: { number: true } }), "RES");
  const isConsignment = input.type === "CONSIGNMENT";

  const reservation = await prisma.$transaction(async (tx) => {
    const createdItems: Prisma.ReservationItemUncheckedCreateWithoutReservationInput[] = [];

    for (const item of items) {
      if (item.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: item.unitId } });
        if (!unit) throw new ApiError(404, "unit.not_found", "Unit not found");
        if (unit.productId !== item.productId) {
          throw new ApiError(400, "unit.product_mismatch", "Unit does not belong to the product");
        }
        if (unit.status !== "IN_STOCK") {
          throw new ApiError(400, "unit.not_in_stock", `Unit ${unit.imei} is not available`);
        }
        if (isConsignment) {
          await tx.unit.update({ where: { id: unit.id }, data: { status: "OUT" } });
          await tx.stockMovement.create({
            data: {
              unitId: unit.id,
              productId: item.productId,
              type: "OUT",
              note: `Consigned ${number} to ${contact.name}`,
            },
          });
        } else {
          await tx.unit.update({ where: { id: unit.id }, data: { status: "RESERVED" } });
          await tx.stockMovement.create({
            data: {
              unitId: unit.id,
              productId: item.productId,
              type: "RESERVED",
              note: `Reserved ${number}`,
            },
          });
        }
        createdItems.push({
          productId: item.productId,
          unitId: unit.id,
          quantity: 1,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        });
      } else {
        createdItems.push({
          productId: item.productId,
          unitId: null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        });
      }
    }

    return tx.reservation.create({
      data: {
        type: input.type,
        number,
        contactId: contact.id,
        userId,
        subtotal,
        discount: input.discount,
        total,
        advance: input.advance,
        status: "ACTIVE",
        note: input.note,
        items: { create: createdItems },
      },
      include: includeReservation,
    });
  });

  await writeAudit({
    userId,
    action: "RESERVATION.CREATE",
    entity: "Reservation",
    entityId: reservation.id,
    details: JSON.stringify({
      number,
      type: input.type,
      total,
      advance: input.advance,
      contact: contact.name,
    }),
  });

  return reservation;
}

export async function listReservations({ status, type }: { status?: string; type?: string } = {}) {
  return prisma.reservation.findMany({
    where: {
      ...(status ? { status: status as ReservationStatus } : {}),
      ...(type ? { type: type as HoldType } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: includeReservation,
  });
}

export async function checkReservationConflicts(unitIds: string[], saleContactId: string) {
  if (unitIds.length === 0) return [];
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "ACTIVE",
      items: { some: { unitId: { in: unitIds } } },
    },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      items: {
        where: { unitId: { in: unitIds } },
        select: { unitId: true, unit: { select: { imei: true } } },
      },
    },
  });

  return reservations
    .filter((reservation) => reservation.contact.id !== saleContactId)
    .map((reservation) => ({
      reservationId: reservation.id,
      reservationNumber: reservation.number,
      contactId: reservation.contact.id,
      contactName: reservation.contact.name,
      contactPhone: reservation.contact.phone,
      total: reservation.total,
      advance: reservation.advance,
      createdAt: reservation.createdAt,
      units: reservation.items.map((item) => ({
        unitId: item.unitId,
        imei: item.unit?.imei ?? null,
      })),
    }));
}

export async function cancelReservation(id: string, userId: string, refunded: boolean) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!reservation) throw new ApiError(404, "reservation.not_found", "Reservation not found");
  if (reservation.status !== "ACTIVE") {
    throw new ApiError(400, "reservation.not_active", "Only active reservations can be cancelled");
  }
  if (reservation.type === "CONSIGNMENT") {
    throw new ApiError(
      400,
      "reservation.use_return",
      "Consigned phones are returned to stock, not cancelled",
    );
  }

  const advance = Number(reservation.advance);

  await prisma.$transaction(async (tx) => {
    for (const item of reservation.items) {
      if (!item.unitId) continue;
      await tx.unit.update({
        where: { id: item.unitId },
        data: { status: "IN_STOCK" },
      });
      await tx.stockMovement.create({
        data: {
          unitId: item.unitId,
          productId: item.productId,
          type: "RELEASED",
          note: `Reservation ${reservation.number} cancelled`,
        },
      });
    }
    if (advance > 0) {
      if (refunded) {
        await tx.reservation.update({
          where: { id },
          data: { status: "CANCELLED", refundStatus: "PAID", refundedAt: new Date() },
        });
      } else {
        await tx.creditAccount.upsert({
          where: { contactId: reservation.contactId },
          create: { contactId: reservation.contactId, limit: 0, balance: -advance },
          update: { balance: { decrement: advance } },
        });
        await tx.reservation.update({
          where: { id },
          data: { status: "CANCELLED", refundStatus: "PENDING", refundedAt: null },
        });
      }
    } else {
      await tx.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
    }
  });

  await writeAudit({
    userId,
    action: "RESERVATION.CANCEL",
    entity: "Reservation",
    entityId: reservation.id,
    details: JSON.stringify({
      number: reservation.number,
      advance,
      refunded,
    }),
  });

  return prisma.reservation.findUnique({ where: { id }, include: includeReservation });
}

export async function markRefundPaid(id: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });
  if (!reservation) throw new ApiError(404, "reservation.not_found", "Reservation not found");
  if (reservation.refundStatus !== "PENDING") {
    throw new ApiError(400, "reservation.no_pending_refund", "No pending refund to mark paid");
  }

  const advance = Number(reservation.advance);

  await prisma.$transaction(async (tx) => {
    await tx.creditAccount.upsert({
      where: { contactId: reservation.contactId },
      create: { contactId: reservation.contactId, limit: 0, balance: advance },
      update: { balance: { increment: advance } },
    });
    await tx.reservation.update({
      where: { id },
      data: { refundStatus: "PAID", refundedAt: new Date() },
    });
  });

  await writeAudit({
    userId,
    action: "RESERVATION.REFUND_PAID",
    entity: "Reservation",
    entityId: reservation.id,
    details: JSON.stringify({ number: reservation.number, advance }),
  });

  return prisma.reservation.findUnique({ where: { id }, include: includeReservation });
}

export async function returnToStock(id: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!reservation) throw new ApiError(404, "reservation.not_found", "Reservation not found");
  if (reservation.type !== "CONSIGNMENT") {
    throw new ApiError(400, "reservation.not_consignment", "Only consignments can be returned to stock");
  }
  if (reservation.status !== "ACTIVE") {
    throw new ApiError(400, "reservation.not_active", "Only active consignments can be returned");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of reservation.items) {
      if (!item.unitId) continue;
      await tx.unit.update({
        where: { id: item.unitId },
        data: { status: "IN_STOCK" },
      });
      await tx.stockMovement.create({
        data: {
          unitId: item.unitId,
          productId: item.productId,
          type: "IN",
          note: `Returned from consignment ${reservation.number}`,
        },
      });
    }
    await tx.reservation.update({ where: { id }, data: { status: "COMPLETED" } });
  });

  await writeAudit({
    userId,
    action: "RESERVATION.RETURN",
    entity: "Reservation",
    entityId: reservation.id,
    details: JSON.stringify({ number: reservation.number }),
  });

  return prisma.reservation.findUnique({ where: { id }, include: includeReservation });
}
