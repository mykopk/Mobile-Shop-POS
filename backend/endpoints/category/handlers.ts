import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./service";
import type { CategoryInput, CategoryUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listCategories() });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const category = await createCategory(req.body as CategoryInput, req.user!.id);
  res.status(201).json({ data: category });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const category = await updateCategory(req.params.id, req.body as CategoryUpdateInput, req.user!.id);
  res.json({ data: category });
}

export async function deactivateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const category = await deactivateCategory(req.params.id, req.user!.id);
  res.json({ data: category });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const result = await deleteCategory(req.params.id, req.user!.id);
  res.json({ data: result });
}
