import type { Request, Response } from "express";
import { canViewCosts } from "../../core/lib/audit";
import { listInventory } from "./service";

export async function inventoryHandler(req: Request, res: Response) {
  const canView = canViewCosts(req.user?.role);
  const result = await listInventory();
  res.json({
    data: {
      units: result.units.map((u) => (canView ? u : { ...u, costPrice: undefined })),
      products: result.products.map((p) => (canView ? p : { ...p, costPrice: undefined })),
      lowStock: result.lowStock,
    },
  });
}
