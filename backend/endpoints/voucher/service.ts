import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { nextNumber } from "../../core/lib/numbering";
import { COMPANY_ID } from "../../core/lib/company";
import type { VoucherInput, VoucherUpdateInput, VoucherType } from "./schemas";

const PREFIX: Record<VoucherType, string> = {
  RECEIVING: "CRV",
  PAYMENT: "CPV",
};

const include = {
  contact: { select: { id: true, name: true, phone: true } },
  bankAccount: { select: { id: true, name: true, bankName: true, accountNo: true } },
  user: { select: { id: true, name: true } },
  reversedBy: { select: { id: true, name: true } },
};

async function nextVoucherNumber(type: VoucherType) {
  const prefix = PREFIX[type];
  return nextNumber(
    () => prisma.voucher.findMany({ where: { number: { startsWith: `${prefix}-` } }, select: { number: true } }),
    prefix,
  );
}

async function assertBank(input: { bankAccountId?: string | null; method?: string }) {
  if (input.method === "BANK_TRANSFER" && !input.bankAccountId) {
    throw new ApiError(400, "voucher.bank_required", "Pick which bank the money went to/from");
  }
  if (input.bankAccountId) {
    const bank = await prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: COMPANY_ID },
    });
    if (!bank) throw new ApiError(400, "voucher.bank_invalid", "Unknown bank account");
  }
}

async function assertContact(contactId?: string | null) {
  if (!contactId) return;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new ApiError(400, "voucher.contact_invalid", "Unknown contact");
}

// CRV (cash in from a contact) reduces what they owe us; CPV (cash out to them) increases it.
// sign: 1 = apply the voucher, -1 = undo it (reverse / modify).
function deltaFor(type: VoucherType, amount: number, sign: 1 | -1) {
  const base = type === "RECEIVING" ? -1 : 1;
  return amount * base * sign;
}

async function applyBalance(contactId: string, delta: number) {
  await prisma.creditAccount.upsert({
    where: { contactId },
    create: { contactId, limit: 0, balance: delta },
    update: { balance: { increment: delta } },
  });
}

export async function listVouchers(filters: { type?: string; status?: string }) {
  return prisma.voucher.findMany({
    where: {
      ...(filters.type ? { type: filters.type as VoucherType } : {}),
      ...(filters.status ? { status: filters.status as "ACTIVE" | "REVERSED" } : {}),
    },
    include,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function getVoucher(id: string) {
  const voucher = await prisma.voucher.findUnique({ where: { id }, include });
  if (!voucher) throw new ApiError(404, "voucher.not_found", "Voucher not found");
  return voucher;
}

export async function createVoucher(input: VoucherInput, userId: string) {
  await assertBank(input);
  await assertContact(input.contactId);

  const number = await nextVoucherNumber(input.type);
  const voucher = await prisma.voucher.create({
    data: {
      type: input.type,
      number,
      amount: input.amount,
      method: input.method,
      bankAccountId: input.bankAccountId || null,
      contactId: input.contactId,
      narration: input.narration || null,
      date: input.date ? new Date(input.date) : new Date(),
      userId,
    },
    include,
  });
  await applyBalance(input.contactId, deltaFor(input.type, input.amount, 1));
  await writeAudit({
    userId,
    action: "VOUCHER.CREATE",
    entity: "Voucher",
    entityId: voucher.id,
    details: JSON.stringify({ number, type: voucher.type, amount: String(voucher.amount) }),
  });
  return voucher;
}

export async function updateVoucher(id: string, input: VoucherUpdateInput, userId: string) {
  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "voucher.not_found", "Voucher not found");
  if (existing.status !== "ACTIVE") {
    throw new ApiError(409, "voucher.reversed", "Reversed vouchers cannot be modified");
  }

  await assertBank(input);
  const nextContactId = input.contactId ?? existing.contactId;
  await assertContact(nextContactId);

  const nextType = input.type ?? existing.type;
  const nextAmount = input.amount ?? Number(existing.amount);

  await applyBalance(existing.contactId!, deltaFor(existing.type, Number(existing.amount), -1));
  await applyBalance(nextContactId!, deltaFor(nextType, nextAmount, 1));

  const voucher = await prisma.voucher.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.method !== undefined ? { method: input.method } : {}),
      ...(input.bankAccountId !== undefined ? { bankAccountId: input.bankAccountId || null } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      ...(input.narration !== undefined ? { narration: input.narration || null } : {}),
      ...(input.date !== undefined && input.date ? { date: new Date(input.date) } : {}),
    },
    include,
  });
  await writeAudit({
    userId,
    action: "VOUCHER.UPDATE",
    entity: "Voucher",
    entityId: voucher.id,
    details: JSON.stringify({ number: voucher.number }),
  });
  return voucher;
}

export async function restoreVoucher(id: string, userId: string) {
  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "voucher.not_found", "Voucher not found");
  if (existing.status !== "REVERSED") {
    throw new ApiError(409, "voucher.not_reversed", "This voucher is not reversed");
  }

  const voucher = await prisma.voucher.update({
    where: { id },
    data: { status: "ACTIVE", reversedById: null, reversedAt: null, reversalNote: null },
    include,
  });
  await applyBalance(existing.contactId!, deltaFor(existing.type, Number(existing.amount), 1));
  await writeAudit({
    userId,
    action: "VOUCHER.RESTORE",
    entity: "Voucher",
    entityId: voucher.id,
    details: JSON.stringify({ number: voucher.number }),
  });
  return voucher;
}

export async function reverseVoucher(id: string, note: string | null | undefined, userId: string) {
  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "voucher.not_found", "Voucher not found");
  if (existing.status !== "ACTIVE") {
    throw new ApiError(409, "voucher.already_reversed", "This voucher is already reversed");
  }

  const voucher = await prisma.voucher.update({
    where: { id },
    data: { status: "REVERSED", reversedById: userId, reversedAt: new Date(), reversalNote: note || null },
    include,
  });
  await applyBalance(existing.contactId!, deltaFor(existing.type, Number(existing.amount), -1));
  await writeAudit({
    userId,
    action: "VOUCHER.REVERSE",
    entity: "Voucher",
    entityId: voucher.id,
    details: JSON.stringify({ number: voucher.number }),
  });
  return voucher;
}
