import { prisma } from "./prisma";
import { ApiError } from "../middleware/error";
import { dateAtZone, DEFAULT_TIMEZONE } from "./time";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

export type MoneyAccount = "cash" | "bank";

export const CASH_ACCOUNT_ID = "main";

// Applies a balance delta to cash or a bank account and records a movement row.
async function adjust(
  db: Db,
  opts: {
    delta: number;
    kind: "IN" | "OUT";
    account: MoneyAccount;
    bankAccountId?: string | null;
    sourceType: string;
    sourceId?: string | null;
    note?: string | null;
    date?: Date | null;
    userId?: string | null;
  },
) {
  if (opts.account === "bank") {
    if (!opts.bankAccountId) {
      throw new ApiError(400, "money.bank_required", "Pick which bank account");
    }
    await db.bankAccount.update({
      where: { id: opts.bankAccountId },
      data: { balance: { increment: opts.delta } },
    });
  } else {
    await db.cashAccount.upsert({
      where: { id: CASH_ACCOUNT_ID },
      create: { id: CASH_ACCOUNT_ID, name: "Cash in hand", balance: opts.delta },
      update: { balance: { increment: opts.delta } },
    });
  }
  await db.moneyMovement.create({
    data: {
      date: opts.date ?? new Date(),
      kind: opts.kind,
      amount: Math.abs(opts.delta),
      account: opts.account,
      bankAccountId: opts.account === "bank" ? opts.bankAccountId ?? null : null,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId ?? null,
      note: opts.note ?? null,
      createdById: opts.userId ?? null,
    },
  });
}

export async function moneyIn(
  db: Db,
  opts: {
    account: MoneyAccount;
    amount: number;
    bankAccountId?: string | null;
    sourceType: string;
    sourceId?: string | null;
    note?: string | null;
    date?: Date | null;
    userId?: string | null;
  },
) {
  if (opts.amount <= 0) return;
  await adjust(db, { ...opts, delta: opts.amount, kind: "IN" });
}

export async function moneyOut(
  db: Db,
  opts: {
    account: MoneyAccount;
    amount: number;
    bankAccountId?: string | null;
    sourceType: string;
    sourceId?: string | null;
    note?: string | null;
    date?: Date | null;
    userId?: string | null;
  },
) {
  if (opts.amount <= 0) return;
  await adjust(db, { ...opts, delta: -opts.amount, kind: "OUT" });
}

export async function moneyTransfer(
  db: Db,
  opts: {
    from: MoneyAccount;
    fromBankId?: string | null;
    to: MoneyAccount;
    toBankId?: string | null;
    amount: number;
    note?: string | null;
    date?: Date | null;
    userId?: string | null;
  },
) {
  if (opts.amount <= 0) return;
  const sourceId = randomUUID();
  await adjust(db, {
    delta: -opts.amount,
    kind: "OUT",
    account: opts.from,
    bankAccountId: opts.fromBankId,
    sourceType: "TRANSFER",
    sourceId,
    note: opts.note ?? null,
    date: opts.date,
    userId: opts.userId,
  });
  await adjust(db, {
    delta: opts.amount,
    kind: "IN",
    account: opts.to,
    bankAccountId: opts.toBankId,
    sourceType: "TRANSFER",
    sourceId,
    note: opts.note ?? null,
    date: opts.date,
    userId: opts.userId,
  });
}

// Reverses every movement recorded for a source (voided return, reversed voucher,
// edited/deleted expense), undoing the balance effect.
export async function reverseMoney(db: Db, sourceType: string, sourceId: string) {
  const movements = await db.moneyMovement.findMany({ where: { sourceType, sourceId } });
  for (const m of movements) {
    const delta = m.kind === "IN" ? -Number(m.amount) : Number(m.amount);
    if (m.account === "bank" && m.bankAccountId) {
      await db.bankAccount.update({
        where: { id: m.bankAccountId },
        data: { balance: { increment: delta } },
      });
    } else {
      await db.cashAccount.upsert({
        where: { id: CASH_ACCOUNT_ID },
        create: { id: CASH_ACCOUNT_ID, name: "Cash in hand", balance: delta },
        update: { balance: { increment: delta } },
      });
    }
    await db.moneyMovement.delete({ where: { id: m.id } });
  }
}

export async function getMoneyOverview() {
  const [cash, banks, cardReceived, cardReturned, cardSettled, credit] = await Promise.all([
    prisma.cashAccount.findUnique({ where: { id: CASH_ACCOUNT_ID } }),
    prisma.bankAccount.findMany({
      where: { active: true },
      select: { id: true, name: true, bankName: true, accountNo: true, balance: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.aggregate({
      where: { method: "CARD", transaction: { type: "SALE" } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { method: "CARD", transaction: { type: "SALE_RETURN" } },
      _sum: { amount: true },
    }),
    prisma.moneyMovement.aggregate({
      where: { sourceType: "CARD_SETTLEMENT", kind: "IN" },
      _sum: { amount: true },
    }),
    prisma.creditAccount.aggregate({ _sum: { balance: true } }),
  ]);

  const received = Number(cardReceived._sum.amount ?? 0);
  const returned = Number(cardReturned._sum.amount ?? 0);
  const settled = Number(cardSettled._sum.amount ?? 0);
  const netCredit = Number(credit._sum.balance ?? 0);

  return {
    cashBalance: Number(cash?.balance ?? 0),
    banks: banks.map((b) => ({ ...b, balance: Number(b.balance) })),
    totalBankBalance: banks.reduce((s, b) => s + Number(b.balance), 0),
    pendingCard: Math.max(0, received - returned - settled),
    receivables: Math.max(0, netCredit),
    payables: Math.max(0, -netCredit),
    summary: {
      cash: Number(cash?.balance ?? 0),
      bank: banks.reduce((s, b) => s + Number(b.balance), 0),
      cardPending: Math.max(0, received - returned - settled),
      credit: netCredit,
    },
  };
}

export async function listMoneyMovements({
  account,
  from,
  to,
  tz,
}: {
  account?: string;
  from?: string;
  to?: string;
  tz?: string;
}) {
  const timezone = tz ?? DEFAULT_TIMEZONE;
  return prisma.moneyMovement.findMany({
    where: {
      ...(account === "cash" ? { account: "cash" } : account === "bank" ? { account: "bank" } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: dateAtZone(from, "00:00:00", timezone) } : {}),
              ...(to ? { lte: dateAtZone(to, "23:59:59", timezone) } : {}),
            },
          }
        : {}),
    },
    include: {
      bankAccount: { select: { id: true, name: true, bankName: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}
