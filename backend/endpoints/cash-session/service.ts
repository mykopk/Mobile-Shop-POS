import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { nextNumber } from "../../core/lib/numbering";
import type { OpenCashSessionInput, CloseCashSessionInput } from "./schemas";

const SESSION_PREFIX = "CS";

async function nextSessionNumber() {
  return nextNumber(
    () => prisma.cashSession.findMany({ where: { number: { startsWith: `${SESSION_PREFIX}-` } }, select: { number: true } }),
    SESSION_PREFIX,
  );
}

export async function getCurrentSession() {
  return prisma.cashSession.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
}

export async function listSessions() {
  return prisma.cashSession.findMany({
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
  });
}

export async function openSession(input: OpenCashSessionInput, userId: string) {
  const open = await getCurrentSession();
  if (open) {
    throw new ApiError(400, "cash_session.already_open", "A cash session is already open");
  }

  const session = await prisma.cashSession.create({
    data: {
      number: await nextSessionNumber(),
      openedById: userId,
      openingFloat: input.openingFloat,
      note: input.note || null,
      status: "OPEN",
    },
  });

  await writeAudit({
    userId,
    action: "CASH_SESSION.OPEN",
    entity: "CashSession",
    entityId: session.id,
    details: JSON.stringify({ number: session.number, openingFloat: input.openingFloat }),
  });
  return session;
}

export async function closeSession(id: string, input: CloseCashSessionInput, userId: string) {
  const session = await prisma.cashSession.findUnique({ where: { id } });
  if (!session) throw new ApiError(404, "cash_session.not_found", "Cash session not found");
  if (session.status !== "OPEN") {
    throw new ApiError(400, "cash_session.already_closed", "Cash session is already closed");
  }

  const report = await computeZReport(session.openedAt, new Date());
  const countedFloat = input.countedFloat;
  const variance = countedFloat - report.expectedClosing;

  const updated = await prisma.cashSession.update({
    where: { id },
    data: {
      closedById: userId,
      closedAt: new Date(),
      closingFloat: report.expectedClosing,
      countedFloat,
      variance,
      note: input.note ?? session.note,
      status: "CLOSED",
    },
  });

  await writeAudit({
    userId,
    action: "CASH_SESSION.CLOSE",
    entity: "CashSession",
    entityId: session.id,
    details: JSON.stringify({ number: session.number, countedFloat, expected: report.expectedClosing, variance }),
  });
  return updated;
}

export interface ZReport {
  openedAt?: Date;
  closedAt?: Date;
  openingFloat: number;
  cashIn: number;
  cashOut: number;
  expectedClosing: number;
  saleCash: number;
  saleReturnCash: number;
  purchaseCash: number;
  purchaseReturnCash: number;
  vouchersIn: number;
  vouchersOut: number;
  expenses: number;
}

export async function computeZReport(from: Date, to: Date): Promise<ZReport> {
  const [salePayments, purchasePayments, saleReturnPayments, purchaseReturnPayments, vouchers, expenses] =
    await Promise.all([
      prisma.payment.findMany({
        where: { method: "CASH", transaction: { type: "SALE", createdAt: { gte: from, lte: to } } },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: { method: "CASH", transaction: { type: "PURCHASE", createdAt: { gte: from, lte: to } } },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: { method: "CASH", transaction: { type: "SALE_RETURN", createdAt: { gte: from, lte: to } } },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: { method: "CASH", transaction: { type: "PURCHASE_RETURN", createdAt: { gte: from, lte: to } } },
        select: { amount: true },
      }),
      prisma.voucher.findMany({
        where: { method: "CASH", date: { gte: from, lte: to } },
        select: { type: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
        select: { amount: true },
      }),
    ]);

  const sum = (rows: { amount: unknown }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

  const saleCash = sum(salePayments);
  const saleReturnCash = sum(saleReturnPayments);
  const purchaseCash = sum(purchasePayments);
  const purchaseReturnCash = sum(purchaseReturnPayments);

  let vouchersIn = 0;
  let vouchersOut = 0;
  for (const v of vouchers) {
    if (v.type === "RECEIVING") vouchersIn += Number(v.amount);
    else vouchersOut += Number(v.amount);
  }

  const expensesTotal = sum(expenses);

  const cashIn = saleCash + purchaseReturnCash + vouchersIn;
  const cashOut = purchaseCash + saleReturnCash + vouchersOut + expensesTotal;
  const openingFloat = 0;

  return {
    openingFloat,
    cashIn,
    cashOut,
    expectedClosing: openingFloat + cashIn - cashOut,
    saleCash,
    saleReturnCash,
    purchaseCash,
    purchaseReturnCash,
    vouchersIn,
    vouchersOut,
    expenses: expensesTotal,
  };
}
