import type { Request, Response } from "express";
import { canViewCosts } from "../../core/lib/audit";
import { ApiError } from "../../core/middleware/error";
import {
  adjustUnit,
  bulkDeleteUnits,
  createUnit,
  getReturnEligibility,
  getSaleReturnEligibility,
  getUnit,
  getUnitByImei,
  importUnits,
  listMovements,
  listUnits,
  updateUnit,
} from "./service";
import type { AdjustInput, ImportUnitInput, UnitInput, UnitUpdateInput } from "./schemas";

function forbidCashier(user: { role?: string } | undefined) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  const { condition, status, q } = req.query;
  const canView = canViewCosts(req.user?.role);
  const units = await listUnits({
    condition: typeof condition === "string" ? condition : undefined,
    status: typeof status === "string" ? status : undefined,
    q: typeof q === "string" ? q : undefined,
  });
  res.json({
    data: units.map((u) => (canView ? u : { ...u, costPrice: undefined })),
  });
}

export async function imeiHandler(req: Request, res: Response) {
  res.json({ data: await getUnitByImei(req.params.imei) });
}

export async function returnEligibleHandler(req: Request, res: Response) {
  const imei = typeof req.query.imei === "string" ? req.query.imei : "";
  const contactId = typeof req.query.contactId === "string" ? req.query.contactId : undefined;
  if (!imei) {
    throw new ApiError(400, "unit.eligibility_required", "imei is required");
  }
  const result = await getReturnEligibility(imei, contactId);
  if (req.user?.role === "CASHIER" && result.eligible) {
    res.json({ data: { ...result, unit: { ...result.unit, costPrice: undefined } } });
    return;
  }
  res.json({ data: result });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getUnit(req.params.id) });
}

export async function saleReturnEligibleHandler(req: Request, res: Response) {
  const imei = typeof req.query.imei === "string" ? req.query.imei : "";
  if (!imei) {
    throw new ApiError(400, "unit.eligibility_required", "imei is required");
  }
  res.json({ data: await getSaleReturnEligibility(imei) });
}

export async function movementsHandler(req: Request, res: Response) {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  res.json({ data: await listMovements({ limit }) });
}

export async function adjustHandler(req: Request, res: Response) {
  forbidCashier(req.user);
  res.json({ data: await adjustUnit(req.body as AdjustInput, req.user!.id) });
}

export async function createHandler(req: Request, res: Response) {
  forbidCashier(req.user);
  res.status(201).json({ data: await createUnit(req.body as UnitInput, req.user!.id) });
}

export async function updateHandler(req: Request, res: Response) {
  forbidCashier(req.user);
  res.json({ data: await updateUnit(req.params.id, req.body as UnitUpdateInput, req.user!.id) });
}

export async function bulkDeleteHandler(req: Request, res: Response) {
  forbidCashier(req.user);
  const ids = (req.body?.ids ?? []) as string[];
  res.json({ data: await bulkDeleteUnits(ids, req.user!.id) });
}

export async function importHandler(req: Request, res: Response) {
  forbidCashier(req.user);
  const rows = req.body.units as ImportUnitInput[];
  res.json({ data: await importUnits(rows, req.user!.id) });
}
