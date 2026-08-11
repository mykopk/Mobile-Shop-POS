import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createBrand,
  deactivateBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "./service";
import type { BrandInput, BrandUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listBrands() });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const brand = await createBrand(req.body as BrandInput, req.user!.id);
  res.status(201).json({ data: brand });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const brand = await updateBrand(req.params.id, req.body as BrandUpdateInput, req.user!.id);
  res.json({ data: brand });
}

export async function deactivateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const brand = await deactivateBrand(req.params.id, req.user!.id);
  res.json({ data: brand });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const result = await deleteBrand(req.params.id, req.user!.id);
  res.json({ data: result });
}
