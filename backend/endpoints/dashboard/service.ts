import { prisma } from "../../core/lib/prisma";

const startOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export async function overview(role: string) {
  const today = startOfDay();
  const canViewCosts = role === "ADMIN" || role === "MANAGER";

  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [todaySales, allSales, todayPurchases, allPurchases, inStockUnits, lowStock, recentSales] =
    await Promise.all([
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
              product: { select: { brand: { select: { name: true } }, model: true, storage: true } },
            },
          },
          payments: { select: { method: true, amount: true } },
        },
      }),
    ]);

  const stockByCondition = inStockUnits.reduce(
    (acc, g) => ({ ...acc, [g.condition]: g._count }),
    { NEW: 0, USED: 0 },
  );

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

  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  const paymentSplit: Record<string, number> = { CASH: 0, CARD: 0, BANK_TRANSFER: 0, CREDIT: 0 };
  let newSold = 0;
  let usedSold = 0;

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
      return Math.round(profit);
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
    },
    all: {
      salesCount: allSales._count,
      revenue: allSales._sum.total ?? 0,
      purchasesCount: allPurchases._count,
      purchasesAmount: allPurchases._sum.total ?? 0,
    },
    stock: { ...stockByCondition, total: stockByCondition.NEW + stockByCondition.USED },
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
