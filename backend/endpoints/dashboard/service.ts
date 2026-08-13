import { prisma } from "../../core/lib/prisma";
import { dayKeyInTz, dateAtZone } from "../../core/lib/time";
import { hasPermissionList, PERMISSIONS, type Permission } from "../../core/lib/permissions";

const startOfDay = (timeZone: string) => {
  const now = new Date();
  return dateAtZone(dayKeyInTz(now, timeZone), "00:00:00", timeZone);
};

export async function overview(permissions: readonly Permission[], timeZone: string) {
  const today = startOfDay(timeZone);
  const canViewCosts = hasPermissionList(permissions, PERMISSIONS.reportProfit);

  const since = new Date(today);
  since.setDate(since.getDate() - 13);

  const [
    todaySales,
    allSales,
    todayPurchases,
    allPurchases,
    inStockUnits,
    lowStock,
    recentSales,
    todayExpenses,
    rangeExpenses,
    todayVouchers,
    returnGroups,
    reservationAgg,
    consignmentCount,
    creditAccounts,
    carrierGroups,
    stockUnits,
    salesByUser,
    users,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "SALE", createdAt: { gte: today } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "SALE" },
      _count: true,
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "PURCHASE", createdAt: { gte: today } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "PURCHASE" },
      _count: true,
      _sum: { total: true },
    }),
    prisma.unit.groupBy({
      by: ["condition"],
      where: { status: "IN_STOCK" },
      _count: true,
    }),
    prisma.product.findMany({
      where: {
        units: { some: { status: "IN_STOCK" } },
      },
      include: {
        brand: { select: { name: true } },
        units: { where: { status: "IN_STOCK" }, select: { id: true, condition: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { type: "SALE", createdAt: { gte: since } },
      select: {
        createdAt: true,
        total: true,
        items: {
          include: {
            unit: { select: { condition: true, costPrice: true } },
            product: {
              select: {
                brand: { select: { name: true } },
                model: true,
                storage: true,
                category: { select: { type: true } },
              },
            },
          },
        },
        payments: { select: { method: true, amount: true } },
      },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: today } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: since } },
      select: { date: true, amount: true },
    }),
    prisma.voucher.findMany({
      where: { status: "ACTIVE", date: { gte: today } },
      select: { type: true, amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        type: { in: ["SALE_RETURN", "PURCHASE_RETURN"] },
        createdAt: { gte: today },
      },
      _count: true,
    }),
    prisma.reservation.aggregate({
      where: { status: "ACTIVE" },
      _count: true,
      _sum: { total: true, advance: true },
    }),
    prisma.reservation.count({ where: { status: "ACTIVE", type: "CONSIGNMENT" } }),
    prisma.creditAccount.findMany({ select: { balance: true } }),
    prisma.unit.groupBy({
      by: ["carrier"],
      where: { status: "IN_STOCK" },
      _count: true,
    }),
    prisma.unit.findMany({
      where: { status: "IN_STOCK" },
      select: { costPrice: true, product: { select: { sellPrice: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["userId"],
      where: { type: "SALE", createdAt: { gte: today } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const stockByCondition = inStockUnits.reduce(
    (acc, g) => ({ ...acc, [g.condition]: g._count }),
    { NEW: 0, USED: 0 },
  );

  const expensesAmount = Number(todayExpenses._sum.amount ?? 0);

  let cashIn = 0;
  let cashOut = 0;
  for (const v of todayVouchers) {
    if (v.type === "RECEIVING") cashIn += Number(v.amount);
    else cashOut += Number(v.amount);
  }

  const returns = { sale: 0, purchase: 0 };
  for (const g of returnGroups) {
    if (g.type === "SALE_RETURN") returns.sale = g._count;
    else returns.purchase = g._count;
  }

  let receivables = 0;
  let payables = 0;
  for (const ca of creditAccounts) {
    const balance = Number(ca.balance);
    if (balance > 0) receivables += balance;
    else payables += -balance;
  }

  const carrierSplit = carrierGroups.reduce(
    (acc, g) => ({ ...acc, [g.carrier]: g._count }),
    { PTA: 0, NON_PTA: 0, SIM_LOCKED: 0 },
  );

  const costValue = stockUnits.reduce((sum, u) => sum + Number(u.costPrice), 0);
  const retailValue = stockUnits.reduce((sum, u) => sum + Number(u.product.sellPrice), 0);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const topSellers = salesByUser
    .map((g) => ({
      id: g.userId,
      name: userMap.get(g.userId) ?? "—",
      count: g._count,
      revenue: Number(g._sum.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  let profitToday = null;
  if (canViewCosts) {
    const items = await prisma.transactionItem.findMany({
      where: {
        transaction: { type: "SALE", createdAt: { gte: today } },
        unit: { isNot: null },
      },
      include: { unit: true },
    });
    profitToday = items.reduce((sum, i) => sum + (Number(i.total) - Number(i.unit?.costPrice ?? 0)), 0);
    profitToday -= Number(todayExpenses._sum.amount ?? 0);
  }

  const lowStockProducts = lowStock
    .filter((p) => p.units.length <= p.lowStockThreshold)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      brand: p.brand.name,
      model: p.model,
      storage: p.storage,
      inStock: p.units.length,
      threshold: p.lowStockThreshold,
    }));

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      key: iso,
      label: d.toLocaleDateString("en-PK", { weekday: "short" }),
      revenue: 0,
      count: 0,
    });
  }
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  const expenseByDay = new Map<string, number>();
  for (const e of rangeExpenses) {
    const key = e.date.toISOString().slice(0, 10);
    expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + Number(e.amount));
  }

  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  const paymentSplit: Record<string, number> = { CASH: 0, CARD: 0, BANK_TRANSFER: 0, CREDIT: 0 };
  let newSold = 0;
  let usedSold = 0;
  let phoneSold = 0;
  let accessorySold = 0;

  for (const s of recentSales) {
    const idx = dayIndex.get(s.createdAt.toISOString().slice(0, 10));
    if (idx !== undefined) {
      days[idx].revenue += Number(s.total);
      days[idx].count += 1;
    }
    for (const p of s.payments) {
      paymentSplit[p.method] = (paymentSplit[p.method] ?? 0) + Number(p.amount);
    }
    for (const it of s.items) {
      if (it.product.category.type === "PHONE") phoneSold += it.quantity;
      else accessorySold += it.quantity;
      const name = `${it.product.brand.name} ${it.product.model} ${it.product.storage ?? ""}`.trim();
      const cur = productMap.get(name) ?? { name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.total);
      productMap.set(name, cur);
      if (it.unit) {
        if (it.unit.condition === "NEW") newSold += 1;
        else usedSold += 1;
      }
    }
  }

  const topProducts = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  let profitTrend: (number | null)[] | null = null;
  if (canViewCosts) {
    profitTrend = days.map((day) => {
      let profit = 0;
      for (const s of recentSales) {
        if (s.createdAt.toISOString().slice(0, 10) !== day.key) continue;
        for (const it of s.items) {
          profit += Number(it.total) - Number(it.unit?.costPrice ?? 0);
        }
      }
      return Math.round(profit - (expenseByDay.get(day.key) ?? 0));
    });
  }

  const recent = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      contact: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  return {
    today: {
      salesCount: todaySales._count,
      revenue: todaySales._sum.total ?? 0,
      profit: profitToday,
      purchasesCount: todayPurchases._count,
      purchasesAmount: todayPurchases._sum.total ?? 0,
      expensesAmount,
      expensesCount: todayExpenses._count,
      cashIn,
      cashOut,
      returns,
    },
    all: {
      salesCount: allSales._count,
      revenue: allSales._sum.total ?? 0,
      purchasesCount: allPurchases._count,
      purchasesAmount: allPurchases._sum.total ?? 0,
    },
    stock: { ...stockByCondition, total: stockByCondition.NEW + stockByCondition.USED },
    stockValue: {
      cost: canViewCosts ? Math.round(costValue) : null,
      retail: Math.round(retailValue),
    },
    carrierSplit,
    reservations: {
      active: reservationAgg._count,
      total: Number(reservationAgg._sum.total ?? 0),
      advance: Number(reservationAgg._sum.advance ?? 0),
      consignments: consignmentCount,
    },
    credit: { receivables, payables },
    topSellers,
    soldByCategory: { PHONE: phoneSold, ACCESSORY: accessorySold },
    lowStock: lowStockProducts,
    sales14d: days,
    topProducts,
    paymentSplit,
    newUsedSold: { NEW: newSold, USED: usedSold },
    profitTrend,
    recent,
  };
}

export async function activityLog(limit: number) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, username: true } } },
  });
}
