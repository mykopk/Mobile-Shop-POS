import type { Request, Response } from "express";
import {
  createBrand,
  deactivateBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "./service";
import type { BrandInput, BrandUpdateInput } from "./schemas";

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listBrands() });
}

export async function createHandler(req: Request, res: Response) {
  const brand = await createBrand(req.body as BrandInput, req.user!.id);
  res.status(201).json({ data: brand });
}

export async function updateHandler(req: Request, res: Response) {
  const brand = await updateBrand(req.params.id, req.body as BrandUpdateInput, req.user!.id);
  res.json({ data: brand });
}

export async function deactivateHandler(req: Request, res: Response) {
  const brand = await deactivateBrand(req.params.id, req.user!.id);
  res.json({ data: brand });
}

export async function deleteHandler(req: Request, res: Response) {
  const result = await deleteBrand(req.params.id, req.user!.id);
  res.json({ data: result });
}
