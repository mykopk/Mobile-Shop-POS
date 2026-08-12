import type { Request, Response } from "express";
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./service";
import type { CategoryInput, CategoryUpdateInput } from "./schemas";

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listCategories() });
}

export async function createHandler(req: Request, res: Response) {
  const category = await createCategory(req.body as CategoryInput, req.user!.id);
  res.status(201).json({ data: category });
}

export async function updateHandler(req: Request, res: Response) {
  const category = await updateCategory(req.params.id, req.body as CategoryUpdateInput, req.user!.id);
  res.json({ data: category });
}

export async function deactivateHandler(req: Request, res: Response) {
  const category = await deactivateCategory(req.params.id, req.user!.id);
  res.json({ data: category });
}

export async function deleteHandler(req: Request, res: Response) {
  const result = await deleteCategory(req.params.id, req.user!.id);
  res.json({ data: result });
}
