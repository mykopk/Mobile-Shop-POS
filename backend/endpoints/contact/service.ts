import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { ContactInput, ImportContactInput } from "./schemas";

export async function findDuplicates(phone?: string, name?: string) {
  if (!phone && !name) return [];
  return prisma.contact.findMany({
    where: {
      OR: [
        ...(phone ? [{ phone: phone.trim() }] : []),
        ...(name ? [{ name: { equals: name.trim(), mode: "insensitive" } }] : []),
      ],
    },
    include: { _count: { select: { transactions: true } } },
    take: 5,
  });
}

export async function listContacts({ q, type }: { q?: string; type?: string }) {
  const where = {
    ...(type ? { type: type as "WALK_IN" | "CUSTOMER" | "VENDOR" | "BOTH" } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      creditAccount: true,
      _count: { select: { transactions: true } },
    },
  });

  return contacts.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
    createdAt: c.createdAt,
    transactionCount: c._count.transactions,
    creditBalance: c.creditAccount?.balance ?? 0,
    creditLimit: c.creditAccount?.limit ?? 0,
  }));
}

export async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      creditAccount: { include: { creditPayments: { orderBy: { paidAt: "desc" } } } },
      transactions: {
        orderBy: { createdAt: "desc" },
        include: { payments: true, _count: { select: { items: true } } },
      },
    },
  });
  if (!contact) throw new ApiError(404, "contact.not_found", "Contact not found");
  return contact;
}

export async function createContact(input: ContactInput, userId: string) {
  const contact = await prisma.contact.create({
    data: {
      type: input.type,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
      creditAccount: {
        create: { limit: input.creditLimit, balance: 0 },
      },
    },
    include: { creditAccount: true },
  });
  await writeAudit({
    userId,
    action: "CONTACT.CREATE",
    entity: "Contact",
    entityId: contact.id,
    details: JSON.stringify({ name: contact.name, phone: contact.phone }),
  });
  return contact;
}

export async function updateContact(id: string, input: ContactInput, userId: string) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "contact.not_found", "Contact not found");

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      type: input.type,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
      creditAccount: input.creditLimit > 0
        ? { upsert: { create: { limit: input.creditLimit, balance: 0 }, update: { limit: input.creditLimit } } }
        : undefined,
    },
    include: { creditAccount: true },
  });
  await writeAudit({
    userId,
    action: "CONTACT.UPDATE",
    entity: "Contact",
    entityId: contact.id,
  });
  return contact;
}

export async function bulkDeleteContacts(ids: string[], userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { id: { in: ids } },
    include: { _count: { select: { transactions: true } } },
  });

  const deletable = contacts
    .filter((c) => c._count.transactions === 0)
    .map((c) => c.id);
  const blocked = contacts
    .filter((c) => c._count.transactions > 0)
    .map((c) => ({ id: c.id, name: c.name }));

  if (deletable.length > 0) {
    await prisma.contact.deleteMany({ where: { id: { in: deletable } } });
  }

  await writeAudit({
    userId,
    action: "CONTACT.DELETE",
    entity: "Contact",
    entityId: deletable.join(","),
    details: JSON.stringify({ deleted: deletable.length, blocked: blocked.length }),
  });

  return { deleted: deletable.length, blocked };
}

export async function importContacts(rows: ImportContactInput[], userId: string) {
  const created: { name: string; phone: string | null }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    try {
      const dupKey = row.phone
        ? `p:${row.phone.trim()}`
        : `n:${row.name.trim().toLowerCase()}`;
      if (seen.has(dupKey)) {
        skipped.push({ name: row.name, reason: "duplicate in file" });
        continue;
      }
      const existing = await prisma.contact.findFirst({
        where: {
          OR: [
            ...(row.phone ? [{ phone: row.phone.trim() }] : []),
            { name: { equals: row.name.trim(), mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        skipped.push({ name: row.name, reason: "already exists" });
        continue;
      }
      seen.add(dupKey);

      const contact = await prisma.contact.create({
        data: {
          type: row.type,
          name: row.name,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          notes: row.notes || null,
          creditAccount: {
            create: { limit: row.creditLimit, balance: 0 },
          },
        },
      });
      created.push({ name: row.name, phone: contact.phone });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid row";
      skipped.push({ name: row.name, reason: message });
    }
  }

  await writeAudit({
    userId,
    action: "CONTACT.IMPORT",
    entity: "Contact",
    entityId: created.map((c) => c.name).join(","),
    details: JSON.stringify({ created: created.length, skipped: skipped.length }),
  });

  return { created, skipped };
}
