import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";

export type Range = { from?: string; to?: string };

const n = (v: unknown) => Number(v ?? 0);
const round = (v: number) => Math.round(v * 100) / 100;
const canViewCosts = (role: string) => role === "ADMIN" || role === "MANAGER";

type RangeWhere = {
  createdAt?: { gte?: Date; lte?: Date };
  date?: { gte?: Date; lte?: Date };
  paidAt?: { gte?: Date; lte?: Date };
};

function rangeWhere(r: Range, field: "createdAt" | "date" | "paidAt" = "createdAt"): RangeWhere {
  const cond: { gte?: Date; lte?: Date } = {};
  if (r.from) cond.gte = new Date(r.from);
  if (r.to) cond.lte = new Date(`${r.to}T23:59:59`);
  if (!cond.gte && !cond.lte) return {};
  return { [field]: cond };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDays(items: { date: Date }[], from?: string, to?: string) {
  const days: { key: string; date: Date }[] = [];
  if (from && to) {
    const cursor = new Date(from);
    const end = new Date(`${to}T23:59:59`);
    while (cursor.getTime() <= end.getTime()) {
      days.push({ key: dayKey(cursor), date: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (items.length > 0) {
    let min = new Date(items[0].date);
    let max = new Date(items[0].date);
    for (const it of items) {
      const t = new Date(it.date).getTime();
      if (t < min.getTime()) min = new Date(it.date);
      if (t > max.getTime()) max = new Date(it.date);
    }
    const cursor = new Date(min);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(max);
    end.setHours(23, 59, 59, 999);
    while (cursor.getTime() <= end.getTime()) {
      days.push({ key: dayKey(cursor), date: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const today = new Date();
    days.push({ key: dayKey(today), date: new Date(today) });
  }
  return days;
}

// ============ SUMMARY ============

export async function summary(role: string, r: Range) {
  const cost = canViewCosts(role);

  const [salesAgg, purchasesAgg, expenseAgg, saleItems, paymentSplit, balancesData] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "SALE", ...rangeWhere(r) },
      _count: true,
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "PURCHASE", ...rangeWhere(r) },
      _count: true,
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { ...rangeWhere(r, "date") },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.transactionItem.findMany({
      where: { transaction: { type: "SALE", ...rangeWhere(r) } },
      select: { quantity: true, unit: { select: { condition: true } } },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { transaction: { type: "SALE", ...rangeWhere(r) } },
      _sum: { amount: true },
    }),
    balances(),
  ]);

  let profit: number | null = null;
  if (cost) {
    const items = await prisma.transactionItem.findMany({
      where: { transaction: { type: "SALE", ...rangeWhere(r) } },
      select: {
        quantity: true,
        total: true,
        unit: { select: { costPrice: true } },
        product: { select: { costPrice: true } },
      },
    });
    const revenue = items.reduce((s, i) => s + n(i.total), 0);
    const costTotal = items.reduce(
      (s, i) => s + n(i.unit?.costPrice ?? i.product.costPrice) * i.quantity,
      0,
    );
    profit = round(revenue - costTotal);
  }

  const itemsSold = saleItems.reduce((s, i) => s + i.quantity, 0);
  const newSold = saleItems
    .filter((i) => i.unit?.condition === "NEW")
    .reduce((s, i) => s + i.quantity, 0);

  return {
    period: r,
    sales: { count: salesAgg._count, revenue: n(salesAgg._sum.total) },
    purchases: { count: purchasesAgg._count, amount: n(purchasesAgg._sum.total) },
    expenses: { count: expenseAgg._count, amount: n(expenseAgg._sum.amount) },
    itemsSold: { total: itemsSold, new: newSold, used: itemsSold - newSold },
    profit,
    paymentSplit: paymentSplit
      .map((p) => ({ method: p.method, amount: n(p._sum.amount) }))
      .sort((a, b) => b.amount - a.amount),
    receivables: balancesData.receivableTotal,
    payables: balancesData.payableTotal,
  };
}

// ============ SALES REPORT ============

export async function salesReport(r: Range) {
  const [agg, items, payments, txns] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "SALE", ...rangeWhere(r) },
      _count: true,
      _sum: { total: true, subtotal: true, discount: true },
    }),
    prisma.transactionItem.findMany({
      where: { transaction: { type: "SALE", ...rangeWhere(r) } },
      select: {
        quantity: true,
        total: true,
        unit: { select: { condition: true } },
        product: {
          select: {
            brand: { select: { name: true } },
            model: true,
            category: { select: { name: true, type: true } },
          },
        },
      },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { transaction: { type: "SALE", ...rangeWhere(r) } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.findMany({
      where: { type: "SALE", ...rangeWhere(r) },
      select: { createdAt: true, total: true, user: { select: { name: true } } },
    }),
  ]);

  const brandMap = new Map<string, { name: string; count: number; revenue: number }>();
  const catMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();
  const condMap = new Map<string, { condition: string; count: number; revenue: number; items: number }>();

  for (const it of items) {
    const brand = it.product.brand.name;
    const curB = brandMap.get(brand) ?? { name: brand, count: 0, revenue: 0 };
    curB.count += 1;
    curB.revenue += n(it.total);
    brandMap.set(brand, curB);

    const cat = it.product.category.name;
    const curC = catMap.get(cat) ?? { name: cat, type: it.product.category.type, count: 0, revenue: 0 };
    curC.count += 1;
    curC.revenue += n(it.total);
    catMap.set(cat, curC);

    const cond = it.unit?.condition ?? "ACCESSORY";
    const curD = condMap.get(cond) ?? { condition: cond, count: 0, revenue: 0, items: 0 };
    curD.count += 1;
    curD.revenue += n(it.total);
    curD.items += it.quantity;
    condMap.set(cond, curD);
  }

  const days = buildDays(txns.map((t) => ({ date: t.createdAt })), r.from, r.to);
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  const daily = days.map((d) => ({ date: d.key, revenue: 0, count: 0 }));
  const userMap = new Map<string, { name: string; count: number; revenue: number }>();

  for (const t of txns) {
    const idx = dayIndex.get(dayKey(t.createdAt));
    if (idx !== undefined) {
      daily[idx].revenue += n(t.total);
      daily[idx].count += 1;
    }
    const u = userMap.get(t.user.name) ?? { name: t.user.name, count: 0, revenue: 0 };
    u.count += 1;
    u.revenue += n(t.total);
    userMap.set(t.user.name, u);
  }

  return {
    count: agg._count,
    revenue: n(agg._sum.total),
    subtotal: n(agg._sum.subtotal),
    discount: n(agg._sum.discount),
    items: items.reduce((s, i) => s + i.quantity, 0),
    byCondition: [...condMap.values()].sort((a, b) => b.revenue - a.revenue),
    byBrand: [...brandMap.values()].sort((a, b) => b.revenue - a.revenue),
    byCategory: [...catMap.values()].sort((a, b) => b.revenue - a.revenue),
    byPayment: payments
      .map((p) => ({ method: p.method, amount: n(p._sum.amount), count: p._count }))
      .sort((a, b) => b.amount - a.amount),
    byUser: [...userMap.values()].sort((a, b) => b.revenue - a.revenue),
    daily: daily.map((d) => ({ ...d, revenue: round(d.revenue) })),
  };
}

// ============ PURCHASE REPORT ============

export async function purchasesReport(r: Range) {
  const [agg, items, txns] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "PURCHASE", ...rangeWhere(r) },
      _count: true,
      _sum: { total: true, subtotal: true, discount: true },
    }),
    prisma.transactionItem.findMany({
      where: { transaction: { type: "PURCHASE", ...rangeWhere(r) } },
      select: {
        quantity: true,
        total: true,
        unit: { select: { condition: true } },
        transaction: { select: { contact: { select: { id: true, name: true } } } },
      },
    }),
    prisma.transaction.findMany({
      where: { type: "PURCHASE", ...rangeWhere(r) },
      select: { createdAt: true, total: true, contact: { select: { name: true } } },
    }),
  ]);

  const condMap = new Map<string, { condition: string; count: number; amount: number; units: number }>();
  const vendorMap = new Map<string, { name: string; count: number; amount: number; units: number }>();

  for (const it of items) {
    const cond = it.unit?.condition ?? "ACCESSORY";
    const curD = condMap.get(cond) ?? { condition: cond, count: 0, amount: 0, units: 0 };
    curD.count += 1;
    curD.amount += n(it.total);
    curD.units += it.quantity;
    condMap.set(cond, curD);

    const vendor = it.transaction.contact.name;
    const curV = vendorMap.get(vendor) ?? { name: vendor, count: 0, amount: 0, units: 0 };
    curV.count += 1;
    curV.amount += n(it.total);
    curV.units += it.quantity;
    vendorMap.set(vendor, curV);
  }

  const days = buildDays(txns.map((t) => ({ date: t.createdAt })), r.from, r.to);
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  const daily = days.map((d) => ({ date: d.key, amount: 0, count: 0 }));

  for (const t of txns) {
    const idx = dayIndex.get(dayKey(t.createdAt));
    if (idx !== undefined) {
      daily[idx].amount += n(t.total);
      daily[idx].count += 1;
    }
  }

  return {
    count: agg._count,
    amount: n(agg._sum.total),
    subtotal: n(agg._sum.subtotal),
    discount: n(agg._sum.discount),
    units: items.reduce((s, i) => s + i.quantity, 0),
    byCondition: [...condMap.values()].sort((a, b) => b.amount - a.amount),
    byVendor: [...vendorMap.values()].sort((a, b) => b.amount - a.amount),
    daily: daily.map((d) => ({ ...d, amount: round(d.amount) })),
  };
}

// ============ PROFIT REPORT ============

export async function profitReport(r: Range) {
  const items = await prisma.transactionItem.findMany({
    where: { transaction: { type: "SALE", ...rangeWhere(r) } },
    select: {
      quantity: true,
      total: true,
      unit: { select: { condition: true, costPrice: true } },
      product: {
        select: {
          brand: { select: { name: true } },
          model: true,
          costPrice: true,
        },
      },
      transaction: { select: { createdAt: true } },
    },
  });

  const rows = items.map((i) => ({
    key: dayKey(i.transaction.createdAt),
    condition: i.unit?.condition ?? "ACCESSORY",
    brand: i.product.brand.name,
    model: `${i.product.brand.name} ${i.product.model}`,
    revenue: n(i.total),
    cost: n(i.unit?.costPrice ?? i.product.costPrice) * i.quantity,
  }));

  const byDay = new Map<string, { key: string; revenue: number; cost: number }>();
  const byBrand = new Map<string, { name: string; revenue: number; cost: number }>();
  const byCondition = new Map<string, { condition: string; revenue: number; cost: number }>();
  const byModel = new Map<string, { name: string; revenue: number; cost: number }>();

  for (const row of rows) {
    const day = byDay.get(row.key) ?? { key: row.key, revenue: 0, cost: 0 };
    day.revenue += row.revenue;
    day.cost += row.cost;
    byDay.set(row.key, day);

    const b = byBrand.get(row.brand) ?? { name: row.brand, revenue: 0, cost: 0 };
    b.revenue += row.revenue;
    b.cost += row.cost;
    byBrand.set(row.brand, b);

    const c = byCondition.get(row.condition) ?? { condition: row.condition, revenue: 0, cost: 0 };
    c.revenue += row.revenue;
    c.cost += row.cost;
    byCondition.set(row.condition, c);

    const m = byModel.get(row.model) ?? { name: row.model, revenue: 0, cost: 0 };
    m.revenue += row.revenue;
    m.cost += row.cost;
    byModel.set(row.model, m);
  }

  const dayList = buildDays(items.map((i) => ({ date: i.transaction.createdAt })), r.from, r.to);
  const daily = dayList.map((d) => {
    const v = byDay.get(d.key);
    const revenue = v?.revenue ?? 0;
    const cost = v?.cost ?? 0;
    return { date: d.key, revenue: round(revenue), cost: round(cost), profit: round(revenue - cost) };
  });

  const revenue = rows.reduce((s, x) => s + x.revenue, 0);
  const cost = rows.reduce((s, x) => s + x.cost, 0);

  const withProfit = <T extends { revenue: number; cost: number }>(list: T[]) =>
    list
      .map((x) => ({ ...x, profit: round(x.revenue - x.cost) }))
      .sort((a, b) => b.profit - a.profit);

  return {
    revenue: round(revenue),
    cost: round(cost),
    profit: round(revenue - cost),
    margin: revenue > 0 ? (revenue - cost) / revenue : 0,
    daily,
    byBrand: withProfit([...byBrand.values()]),
    byCondition: withProfit([...byCondition.values()]),
    byModel: withProfit([...byModel.values()]).slice(0, 20),
  };
}

// ============ EXPENSE REPORT ============

export async function expensesReport(r: Range) {
  const [agg, rows] = await Promise.all([
    prisma.expense.aggregate({
      where: { ...rangeWhere(r, "date") },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { ...rangeWhere(r, "date") },
      select: { date: true, amount: true, category: true },
    }),
  ]);

  const catMap = new Map<string, { category: string; count: number; total: number }>();
  for (const e of rows) {
    const cur = catMap.get(e.category) ?? { category: e.category, count: 0, total: 0 };
    cur.count += 1;
    cur.total += n(e.amount);
    catMap.set(e.category, cur);
  }

  const days = buildDays(rows, r.from, r.to);
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  const daily = days.map((d) => ({ date: d.key, total: 0, count: 0 }));
  for (const e of rows) {
    const idx = dayIndex.get(dayKey(e.date));
    if (idx !== undefined) {
      daily[idx].total += n(e.amount);
      daily[idx].count += 1;
    }
  }

  return {
    total: n(agg._sum.amount),
    count: agg._count,
    byCategory: [...catMap.values()].sort((a, b) => b.total - a.total),
    daily: daily.map((d) => ({ ...d, total: round(d.total) })),
  };
}

// ============ STOCK VALUATION ============

export async function stockReport(role: string) {
  const cost = canViewCosts(role);
  const units = await prisma.unit.findMany({
    where: { status: "IN_STOCK" },
    select: {
      condition: true,
      costPrice: true,
      product: {
        select: {
          brand: { select: { name: true } },
          model: true,
          sellPrice: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const byCondition = new Map<string, { condition: string; units: number; costValue: number; retailValue: number }>();
  const byCategory = new Map<string, { name: string; units: number; costValue: number; retailValue: number }>();
  const byBrand = new Map<string, { name: string; units: number; costValue: number; retailValue: number }>();

  for (const u of units) {
    const costV = n(u.costPrice);
    const retailV = n(u.product.sellPrice);

    const c = byCondition.get(u.condition) ?? { condition: u.condition, units: 0, costValue: 0, retailValue: 0 };
    c.units += 1;
    c.costValue += costV;
    c.retailValue += retailV;
    byCondition.set(u.condition, c);

    const cat = u.product.category.name;
    const k = byCategory.get(cat) ?? { name: cat, units: 0, costValue: 0, retailValue: 0 };
    k.units += 1;
    k.costValue += costV;
    k.retailValue += retailV;
    byCategory.set(cat, k);

    const brand = u.product.brand.name;
    const b = byBrand.get(brand) ?? { name: brand, units: 0, costValue: 0, retailValue: 0 };
    b.units += 1;
    b.costValue += costV;
    b.retailValue += retailV;
    byBrand.set(brand, b);
  }

  const totalCost = units.reduce((s, u) => s + n(u.costPrice), 0);
  const totalRetail = units.reduce((s, u) => s + n(u.product.sellPrice), 0);

  return {
    units: units.length,
    costValue: cost ? round(totalCost) : null,
    retailValue: round(totalRetail),
    byCondition: [...byCondition.values()].sort((a, b) => b.costValue - a.costValue),
    byCategory: [...byCategory.values()].sort((a, b) => b.costValue - a.costValue),
    byBrand: [...byBrand.values()].sort((a, b) => b.costValue - a.costValue),
  };
}

// ============ PAYMENTS / CASH FLOW ============

export async function paymentsReport(r: Range) {
  const [byMethod, salePaid, purchasePaid, creditPaid, vouchers, expenseTotal] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      where: { ...rangeWhere(r) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { method: { not: "CREDIT" }, transaction: { type: "SALE", ...rangeWhere(r) } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { method: { not: "CREDIT" }, transaction: { type: "PURCHASE", ...rangeWhere(r) } },
      _sum: { amount: true },
    }),
    prisma.creditPayment.aggregate({
      where: { ...rangeWhere(r, "paidAt") },
      _sum: { amount: true },
    }),
    prisma.voucher.findMany({
      where: { status: "ACTIVE", ...rangeWhere(r, "date") },
      select: { type: true, amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...rangeWhere(r, "date") },
      _sum: { amount: true },
    }),
  ]);

  const crv = vouchers.filter((v) => v.type === "RECEIVING").reduce((s, v) => s + n(v.amount), 0);
  const cpv = vouchers.filter((v) => v.type === "PAYMENT").reduce((s, v) => s + n(v.amount), 0);

  const inflows = [
    { label: "Sales received", amount: n(salePaid._sum.amount) },
    { label: "Credit recovered", amount: n(creditPaid._sum.amount) },
  ];
  if (crv > 0) inflows.push({ label: "Receiving vouchers", amount: crv });

  const outflows = [
    { label: "Purchases paid", amount: n(purchasePaid._sum.amount) },
    { label: "Expenses", amount: n(expenseTotal._sum.amount) },
  ];
  if (cpv > 0) outflows.push({ label: "Payment vouchers", amount: cpv });

  return {
    byMethod: byMethod
      .map((p) => ({ method: p.method, amount: n(p._sum.amount), count: p._count }))
      .sort((a, b) => b.amount - a.amount),
    inflows: inflows.map((i) => ({ ...i, amount: round(i.amount) })),
    outflows: outflows.map((i) => ({ ...i, amount: round(i.amount) })),
    totalIn: round(inflows.reduce((s, i) => s + i.amount, 0)),
    totalOut: round(outflows.reduce((s, i) => s + i.amount, 0)),
  };
}

// ============ RECEIVABLES / PAYABLES ============

type BalanceRow = {
  contactId: string;
  name: string;
  phone: string | null;
  count: number;
  total: number;
  paid: number;
  outstanding: number;
  source: "CREDIT" | "REFUND";
};

export async function balances() {
  const [openSales, openPurchases, refunds] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "SALE", status: { in: ["PARTIAL", "PENDING"] } },
      select: {
        total: true,
        contact: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { type: "PURCHASE", status: { in: ["PARTIAL", "PENDING"] } },
      select: {
        total: true,
        contact: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { status: "CANCELLED", refundStatus: "PENDING" },
      select: {
        advance: true,
        contact: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  function collect(
    rows: (typeof openSales)[number][],
    source: "CREDIT",
  ) {
    const map = new Map<string, BalanceRow>();
    for (const t of rows) {
      const paid = t.payments.reduce((s, p) => s + n(p.amount), 0);
      const outstanding = Math.max(0, n(t.total) - paid);
      if (outstanding <= 0) continue;
      const row = map.get(t.contact.id) ?? {
        contactId: t.contact.id,
        name: t.contact.name,
        phone: t.contact.phone,
        count: 0,
        total: 0,
        paid: 0,
        outstanding: 0,
        source,
      };
      row.count += 1;
      row.total += n(t.total);
      row.paid += paid;
      row.outstanding += outstanding;
      map.set(t.contact.id, row);
    }
    return [...map.values()];
  }

  const receivables = collect(openSales, "CREDIT").sort((a, b) => b.outstanding - a.outstanding);
  const payableRows = collect(openPurchases, "CREDIT");
  for (const r of refunds) {
    payableRows.push({
      contactId: r.contact.id,
      name: r.contact.name,
      phone: r.contact.phone,
      count: 1,
      total: n(r.advance),
      paid: 0,
      outstanding: n(r.advance),
      source: "REFUND",
    });
  }
  const payables = payableRows.sort((a, b) => b.outstanding - a.outstanding);

  return {
    receivables,
    payables,
    receivableTotal: receivables.reduce((s, x) => s + x.outstanding, 0),
    payableTotal: payables.reduce((s, x) => s + x.outstanding, 0),
  };
}

// ============ CONTACT LEDGER ============

export async function ledgerReport(contactId: string, r: Range) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, phone: true, type: true },
  });
  if (!contact) throw new ApiError(404, "report.contact_not_found", "Contact not found");

  const [transactions, payments, vouchers, expenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { contactId, ...rangeWhere(r) },
      select: { id: true, type: true, number: true, total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { transaction: { contactId, ...rangeWhere(r) } },
      select: {
        id: true,
        method: true,
        amount: true,
        createdAt: true,
        transaction: { select: { number: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.voucher.findMany({
      where: { contactId, ...rangeWhere(r, "date") },
      select: { id: true, type: true, number: true, amount: true, date: true, status: true },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { contactId, ...rangeWhere(r, "date") },
      select: { id: true, category: true, amount: true, note: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  type Entry = {
    id: string;
    date: Date;
    type: string;
    ref: string;
    debit: number;
    credit: number;
  };

  const entries: Entry[] = [];

  for (const t of transactions) {
    const isDebit = t.type === "SALE" || t.type === "PURCHASE_RETURN";
    entries.push({
      id: `t-${t.id}`,
      date: t.createdAt,
      type: t.type,
      ref: t.number,
      debit: isDebit ? n(t.total) : 0,
      credit: isDebit ? 0 : n(t.total),
    });
  }

  for (const p of payments) {
    const isSalePayment = p.transaction.type === "SALE";
    entries.push({
      id: `p-${p.id}`,
      date: p.createdAt,
      type: `PAYMENT_${p.method}`,
      ref: p.transaction.number,
      debit: isSalePayment ? 0 : n(p.amount),
      credit: isSalePayment ? n(p.amount) : 0,
    });
  }

  for (const v of vouchers) {
    if (v.status !== "ACTIVE") continue;
    const isReceiving = v.type === "RECEIVING";
    entries.push({
      id: `v-${v.id}`,
      date: v.date,
      type: `VOUCHER_${v.type}`,
      ref: v.number,
      debit: isReceiving ? 0 : n(v.amount),
      credit: isReceiving ? n(v.amount) : 0,
    });
  }

  for (const e of expenses) {
    entries.push({
      id: `e-${e.id}`,
      date: e.date,
      type: "EXPENSE",
      ref: e.category,
      debit: n(e.amount),
      credit: 0,
    });
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const rows = entries.map((e) => {
    balance += e.debit - e.credit;
    return {
      id: e.id,
      date: e.date.toISOString(),
      type: e.type,
      ref: e.ref,
      debit: round(e.debit),
      credit: round(e.credit),
      balance: round(balance),
    };
  });

  return {
    contact,
    rows,
    closing: rows.length > 0 ? rows[rows.length - 1].balance : 0,
  };
}
