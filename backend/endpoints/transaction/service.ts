import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { nextNumber } from "../../core/lib/numbering";
import type { TransactionType, UnitSource } from "../../generated/prisma/enums";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CreatePurchaseInput,
  CreateSaleInput,
  PurchaseReturnInput,
  SaleReturnInput,
} from "./schemas";

type Db = Prisma.TransactionClient | typeof prisma;

type PaymentInput = {
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "CREDIT";
  amount: number;
  reference?: string;
  bankAccountId?: string;
};

async function resolveNumber(requested: string | undefined, prefix: string) {
  if (requested) {
    const exists = await prisma.transaction.findUnique({ where: { number: requested } });
    if (!exists) return requested;
  }
  return nextNumber(
    () => prisma.transaction.findMany({ where: { number: { startsWith: `${prefix}-` } }, select: { number: true } }),
    prefix,
  );
}

async function applyPayments(
  db: Db,
  transactionId: string,
  contactId: string,
  payments: PaymentInput[],
  balanceSign: 1 | -1 = 1,
) {
  let paid = 0;
  for (const p of payments) {
    await db.payment.create({
      data: {
        transactionId,
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        bankAccountId: p.bankAccountId,
      },
    });
    paid += p.amount;
    if (p.method === "CREDIT") {
      await db.creditAccount.update({
        where: { contactId },
        data: { balance: { increment: p.amount * balanceSign } },
      });
    }
  }
  return paid;
}

function statusFor(total: number, paid: number) {
  if (paid >= total) return "PAID" as const;
  if (paid > 0) return "PARTIAL" as const;
  return "PENDING" as const;
}

function includeTransaction() {
  return {
    contact: true,
    user: true,
    items: { include: { product: true, unit: true } },
    payments: { include: { bankAccount: true } },
  } as const;
}

export async function createSale(input: CreateSaleInput, userId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
  if (!contact) throw new ApiError(404, "contact.not_found", "Contact not found");

  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new ApiError(404, "product.not_found", "Product not found");
  }

  const items = input.items.map((i) => {
    const total = i.unitId
      ? i.unitPrice - i.discount
      : (i.unitPrice - i.discount) * i.quantity;
    return { ...i, total };
  });
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal - input.discount;
  if (total < 0) throw new ApiError(400, "transaction.negative_total", "Total cannot be negative");

  const paidInput = input.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paidInput > total + 0.001) {
    throw new ApiError(400, "payment.overpaid", "Payments exceed the total");
  }

  const number = await nextNumber(
    () => prisma.transaction.findMany({ where: { number: { startsWith: "SAL-" } }, select: { number: true } }),
    "SAL",
  );
  const transaction = await prisma.$transaction(async (tx) => {
    const createdItems: Prisma.TransactionItemUncheckedCreateWithoutTransactionInput[] = [];

    for (const item of items) {
      if (item.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: item.unitId } });
        if (!unit) throw new ApiError(404, "unit.not_found", "Unit not found");
        if (unit.status !== "IN_STOCK" && unit.status !== "RESERVED" && unit.status !== "OUT") {
          throw new ApiError(400, "unit.not_in_stock", `Unit ${unit.imei} is not in stock`);
        }
        if (unit.productId !== item.productId) {
          throw new ApiError(400, "unit.product_mismatch", "Unit does not belong to the product");
        }

        await tx.unit.update({ where: { id: unit.id }, data: { status: "SOLD" } });
        await tx.stockMovement.create({
          data: { unitId: unit.id, productId: item.productId, type: "OUT", note: "Sold" },
        });
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

    const created = await tx.transaction.create({
      data: {
        type: "SALE",
        number,
        contactId: contact.id,
        userId,
        subtotal,
        discount: input.discount,
        total,
        status: statusFor(total, paidInput),
        note: input.note,
        items: { create: createdItems },
      },
      include: { items: true },
    });

    await applyPayments(tx, created.id, contact.id, input.payments);

    const soldUnitIds = items.filter((i) => i.unitId).map((i) => i.unitId as string);
    const reservations = soldUnitIds.length
      ? await tx.reservation.findMany({
          where: {
            status: "ACTIVE",
            items: { some: { unitId: { in: soldUnitIds } } },
          },
          include: { items: true },
        })
      : [];

    let advanceAdded = 0;
    for (const reservation of reservations) {
      const advance = Number(reservation.advance);
      if (reservation.contactId === contact.id && advance > 0) {
        const remainder = Math.max(0, total - paidInput - advanceAdded);
        const toAdd = Math.min(advance, remainder);
        if (toAdd > 0) {
          await tx.payment.create({
            data: {
              transactionId: created.id,
              method: "CASH",
              amount: toAdd,
              reference: `Advance from ${reservation.number}`,
            },
          });
          advanceAdded += toAdd;
        }
      }
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED", saleId: created.id },
      });
      for (const item of reservation.items) {
        if (!item.unitId || !soldUnitIds.includes(item.unitId)) continue;
        await tx.stockMovement.create({
          data: {
            unitId: item.unitId,
            productId: item.productId,
            type: "OUT",
            note: `Sold from ${reservation.number}`,
          },
        });
      }
    }

    if (advanceAdded > 0) {
      await tx.transaction.update({
        where: { id: created.id },
        data: { status: statusFor(total, paidInput + advanceAdded) },
      });
    }

    return created;
  });

  await writeAudit({
    userId,
    action: "SALE.CREATE",
    entity: "Transaction",
    entityId: transaction.id,
    details: JSON.stringify({ number, total, contact: contact.name }),
  });

  return prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: includeTransaction(),
  });
}

export async function createPurchase(input: CreatePurchaseInput, userId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
  if (!contact) throw new ApiError(404, "contact.not_found", "Contact not found");

  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new ApiError(404, "product.not_found", "Product not found");
    if (item.imei) {
      const existing = await prisma.unit.findUnique({ where: { imei: item.imei } });
      if (existing) throw new ApiError(400, "unit.imei_exists", `IMEI ${item.imei} already exists`);
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.costPrice * (i.quantity ?? 1), 0);
  const total = subtotal - input.discount;
  if (total < 0) throw new ApiError(400, "transaction.negative_total", "Total cannot be negative");

  const paidInput = input.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paidInput > total + 0.001) {
    throw new ApiError(400, "payment.overpaid", "Payments exceed the total");
  }

  const number = await resolveNumber(input.number, "PUR");
  const createdAt = input.date ? new Date(`${input.date}T00:00:00`) : undefined;
  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        type: "PURCHASE",
        number,
        contactId: contact.id,
        userId,
        subtotal,
        discount: input.discount,
        total,
        status: statusFor(total, paidInput),
        note: input.note,
        ...(createdAt ? { createdAt } : {}),
      },
    });

    for (const item of input.items) {
      if (item.imei) {
        const unit = await tx.unit.create({
          data: {
            productId: item.productId,
            imei: item.imei,
            condition: item.condition,
            status: "IN_STOCK",
            source: item.condition === "USED" ? "BOUGHT_WALKIN" : "VENDOR_PURCHASE",
            carrier: item.carrier ?? "NON_PTA",
            batteryHealth: item.batteryHealth,
            costPrice: item.costPrice,
            grade: item.grade,
            colorId: item.colorId,
          },
        });
        await tx.stockMovement.create({
          data: { unitId: unit.id, productId: item.productId, type: "IN", note: "Purchased" },
        });
        await tx.transactionItem.create({
          data: {
            transactionId: created.id,
            productId: item.productId,
            unitId: unit.id,
            quantity: 1,
            unitPrice: item.costPrice,
            discount: 0,
            total: item.costPrice,
          },
        });
      } else {
        const qty = item.quantity ?? 1;
        await tx.stockMovement.create({
          data: { productId: item.productId, type: "IN", qty, note: "Purchased" },
        });
        await tx.transactionItem.create({
          data: {
            transactionId: created.id,
            productId: item.productId,
            unitId: null,
            quantity: qty,
            unitPrice: item.costPrice,
            discount: 0,
            total: item.costPrice * qty,
          },
        });
      }
    }

    await applyPayments(tx, created.id, contact.id, input.payments, -1);
    return created;
  });

  await writeAudit({
    userId,
    action: "PURCHASE.CREATE",
    entity: "Transaction",
    entityId: transaction.id,
    details: JSON.stringify({ number, total, contact: contact.name }),
  });

  return prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: includeTransaction(),
  });
}

export async function createSaleReturn(input: SaleReturnInput, userId: string) {
  const sale = await prisma.transaction.findUnique({ where: { id: input.saleId } });
  if (!sale) throw new ApiError(404, "transaction.not_found", "Transaction not found");
  if (sale.type !== "SALE") throw new ApiError(400, "transaction.not_sale", "Not a sale");

  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new ApiError(404, "product.not_found", "Product not found");
  }

  const number = await resolveNumber(input.number, "RET");
  const createdAt = input.date ? new Date(`${input.date}T00:00:00`) : undefined;
  const saleItems = await prisma.transactionItem.findMany({
    where: { transactionId: input.saleId },
  });
  const saleItemByUnit = new Map(saleItems.filter((i) => i.unitId).map((i) => [i.unitId as string, i]));
  const saleItemByProduct = new Map(saleItems.filter((i) => !i.unitId).map((i) => [i.productId, i]));
  const transaction = await prisma.$transaction(async (tx) => {
    const createdItems: Prisma.TransactionItemUncheckedCreateWithoutTransactionInput[] = [];
    let total = 0;

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new ApiError(404, "product.not_found", "Product not found");

      if (item.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: item.unitId } });
        if (!unit || unit.status !== "SOLD") {
          throw new ApiError(400, "unit.not_sold", "Unit is not sold or not found");
        }
        const saleItem = saleItemByUnit.get(item.unitId);
        const refund = saleItem
          ? Number(saleItem.unitPrice) - Number(saleItem.discount)
          : Number(product.sellPrice);
        await tx.unit.update({
          where: { id: unit.id },
          data: { status: "IN_STOCK", condition: "USED", source: "SALE_RETURN", returnedFromSource: unit.source },
        });
        await tx.stockMovement.create({
          data: { unitId: unit.id, productId: item.productId, type: "IN", note: "Sale return" },
        });
        createdItems.push({
          productId: item.productId,
          unitId: unit.id,
          quantity: 1,
          unitPrice: refund,
          discount: 0,
          total: refund,
        });
        total += refund;
      } else {
        const saleItem = saleItemByProduct.get(item.productId);
        const unitPrice = saleItem ? Number(saleItem.unitPrice) : Number(product.sellPrice);
        const lineTotal = unitPrice * item.quantity;
        createdItems.push({
          productId: item.productId,
          unitId: null,
          quantity: item.quantity,
          unitPrice,
          discount: 0,
          total: lineTotal,
        });
        total += lineTotal;
      }
    }

    const paidInput = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paidInput > total + 0.001) {
      throw new ApiError(400, "payment.overpaid", "Payments exceed the refund total");
    }

    const explicitPayments = input.payments.length > 0;
    const payments = explicitPayments
      ? input.payments
      : [{ method: input.refundMethod, amount: total }];
    const status = explicitPayments
      ? statusFor(total, paidInput)
      : input.refundMethod === "CASH"
        ? "PAID"
        : "PENDING";

    const created = await tx.transaction.create({
      data: {
        type: "SALE_RETURN",
        number,
        contactId: sale.contactId,
        userId,
        subtotal: total,
        discount: 0,
        total,
        status,
        note: input.note ?? `Return for ${sale.number}`,
        ...(createdAt ? { createdAt } : {}),
        items: { create: createdItems },
      },
    });

    for (const p of payments) {
      await tx.payment.create({
        data: {
          transactionId: created.id,
          method: p.method,
          amount: p.amount,
          reference: p.reference,
          bankAccountId: p.bankAccountId,
        },
      });
      if (p.method === "CREDIT") {
        await tx.creditAccount.update({
          where: { contactId: sale.contactId },
          data: { balance: { decrement: p.amount } },
        });
      }
    }
    return created;
  });

  await writeAudit({
    userId,
    action: "SALE_RETURN.CREATE",
    entity: "Transaction",
    entityId: transaction.id,
    details: JSON.stringify({ number, total: Number(transaction.total), of: sale.number }),
  });

  return transaction;
}

export async function createPurchaseReturn(input: PurchaseReturnInput, userId: string) {
  const purchase = await prisma.transaction.findUnique({ where: { id: input.purchaseId } });
  if (!purchase) throw new ApiError(404, "transaction.not_found", "Transaction not found");
  if (purchase.type !== "PURCHASE") {
    throw new ApiError(400, "transaction.not_purchase", "Not a purchase");
  }

  const number = await resolveNumber(input.number, "PCR");
  const createdAt = input.date ? new Date(`${input.date}T00:00:00`) : undefined;
  const transaction = await prisma.$transaction(async (tx) => {
    const units = await tx.unit.findMany({ where: { id: { in: input.unitIds } } });
    if (units.length !== input.unitIds.length) {
      throw new ApiError(400, "unit.not_found", "One or more units not found");
    }

    const purchaseItems = await tx.transactionItem.findMany({
      where: { transactionId: input.purchaseId, unitId: { not: null } },
      select: { unitId: true },
    });
    const purchaseUnitIds = new Set(purchaseItems.map((i) => i.unitId));

    let total = 0;
    const createdItems: Prisma.TransactionItemUncheckedCreateWithoutTransactionInput[] = [];

    for (const unit of units) {
      if (!purchaseUnitIds.has(unit.id)) {
        throw new ApiError(400, "unit.not_from_purchase", `Unit ${unit.imei} does not belong to this purchase`);
      }
      if (unit.status !== "IN_STOCK") {
        throw new ApiError(400, "unit.not_in_stock", `Unit ${unit.imei} is not in stock`);
      }
      await tx.unit.update({
        where: { id: unit.id },
        data: { status: "RETURNED", source: "PURCHASE_RETURN", returnedFromSource: unit.source },
      });
      await tx.stockMovement.create({
        data: { unitId: unit.id, productId: unit.productId, type: "OUT", note: "Purchase return" },
      });
      total += Number(unit.costPrice);
      createdItems.push({
        productId: unit.productId,
        unitId: unit.id,
        quantity: 1,
        unitPrice: Number(unit.costPrice),
        discount: 0,
        total: Number(unit.costPrice),
      });
    }

    const paidInput = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paidInput > total + 0.001) {
      throw new ApiError(400, "payment.overpaid", "Payments exceed the refund total");
    }

    const explicitPayments = input.payments.length > 0;
    const payments = explicitPayments
      ? input.payments
      : [{ method: input.refundMethod, amount: total }];
    const status = explicitPayments
      ? statusFor(total, paidInput)
      : input.refundMethod === "CASH"
        ? "PAID"
        : "PENDING";

    const created = await tx.transaction.create({
      data: {
        type: "PURCHASE_RETURN",
        number,
        contactId: purchase.contactId,
        userId,
        subtotal: total,
        discount: 0,
        total,
        status,
        note: input.note ?? `Return for ${purchase.number}`,
        ...(createdAt ? { createdAt } : {}),
        items: { create: createdItems },
      },
    });

    for (const p of payments) {
      await tx.payment.create({
        data: {
          transactionId: created.id,
          method: p.method,
          amount: p.amount,
          reference: p.reference,
          bankAccountId: p.bankAccountId,
        },
      });
      if (p.method === "CREDIT") {
        await tx.creditAccount.upsert({
          where: { contactId: purchase.contactId },
          create: { contactId: purchase.contactId, limit: 0, balance: p.amount },
          update: { balance: { increment: p.amount } },
        });
      }
    }

    return created;
  });

  await writeAudit({
    userId,
    action: "PURCHASE_RETURN.CREATE",
    entity: "Transaction",
    entityId: transaction.id,
    details: JSON.stringify({ number, total: Number(transaction.total), of: purchase.number }),
  });

  return transaction;
}

export async function voidReturn(id: string, userId: string) {
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn) throw new ApiError(404, "transaction.not_found", "Transaction not found");
  if (txn.type !== "PURCHASE_RETURN" && txn.type !== "SALE_RETURN") {
    throw new ApiError(400, "transaction.not_return", "Only returns can be voided");
  }

  const payments = await prisma.payment.findMany({ where: { transactionId: id } });

  await prisma.$transaction(async (tx) => {
    const items = await tx.transactionItem.findMany({
      where: { transactionId: id, unitId: { not: null } },
      select: { unitId: true },
    });
    const unitIds = items.map((i) => i.unitId).filter(Boolean) as string[];
    if (unitIds.length > 0) {
      const units = await tx.unit.findMany({ where: { id: { in: unitIds } } });
      for (const unit of units) {
        const originalSource = (unit.returnedFromSource as UnitSource) ?? "VENDOR_PURCHASE";
        if (txn.type === "PURCHASE_RETURN") {
          await tx.unit.update({
            where: { id: unit.id },
            data: { status: "IN_STOCK", source: originalSource, returnedFromSource: null },
          });
          await tx.stockMovement.create({
            data: { unitId: unit.id, productId: unit.productId, type: "IN", note: `Return voided (${txn.number})` },
          });
        } else {
          await tx.unit.update({
            where: { id: unit.id },
            data: { status: "SOLD", source: originalSource, returnedFromSource: null },
          });
          await tx.stockMovement.create({
            data: { unitId: unit.id, productId: unit.productId, type: "OUT", note: `Return voided (${txn.number})` },
          });
        }
      }
    }

    for (const p of payments) {
      if (p.method === "CREDIT") {
        const balance =
          txn.type === "PURCHASE_RETURN" ? { decrement: p.amount } : { increment: p.amount };
        await tx.creditAccount.update({
          where: { contactId: txn.contactId },
          data: { balance },
        });
      }
    }

    await tx.transaction.delete({ where: { id } });
  });

  await writeAudit({
    userId,
    action: `${txn.type}.VOID`,
    entity: "Transaction",
    entityId: id,
    details: JSON.stringify({ number: txn.number, total: Number(txn.total) }),
  });

  return { id, number: txn.number };
}

export async function listTransactions({
  type,
  q,
  limit,
}: {
  type?: string;
  q?: string;
  limit?: number;
}) {
  return prisma.transaction.findMany({
    where: {
      ...(type ? { type: type as TransactionType } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q } },
              { contact: { name: { contains: q } } },
              { items: { some: { product: { model: { contains: q } } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit ?? 50,
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      _count: { select: { items: true } },
      payments: { select: { method: true, amount: true } },
    },
  });
}

export async function getTransaction(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      contact: true,
      user: { select: { id: true, name: true, username: true } },
      items: { include: { product: true, unit: true } },
      payments: { include: { bankAccount: true } },
    },
  });
  if (!transaction) throw new ApiError(404, "transaction.not_found", "Transaction not found");
  return transaction;
}
