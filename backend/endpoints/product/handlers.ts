import type { Request, Response } from "express";
import { canViewCosts } from "../../core/lib/audit";
import { ApiError } from "../../core/middleware/error";
import {
  bulkDeleteProducts,
  createProduct,
  getProduct,
  importProducts,
  listProducts,
  searchProducts,
  updateProduct,
} from "./service";
import type { ImportProductInput, ProductInput } from "./schemas";

function stripCosts<T extends { costPrice?: unknown }>(item: T, canView: boolean) {
  if (!canView) delete item.costPrice;
  return item;
}

export async function listHandler(req: Request, res: Response) {
  const { q, categoryId } = req.query;
  const items = await listProducts({
    q: typeof q === "string" ? q : undefined,
    categoryId: typeof categoryId === "string" ? categoryId : undefined,
  });
  const canView = canViewCosts(req.user?.role);
  res.json({ data: items.map((p) => stripCosts(p, canView)) });
}

export async function getHandler(req: Request, res: Response) {
  const product = await getProduct(req.params.id);
  res.json({ data: stripCosts(product, canViewCosts(req.user?.role)) });
}

export async function createHandler(req: Request, res: Response) {
  if (req.user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
  const input = req.body as ProductInput;
  const product = await createProduct(input, req.user!.id);
  res.status(201).json({ data: product });
}

export async function updateHandler(req: Request, res: Response) {
  if (req.user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
  const product = await updateProduct(req.params.id, req.body as ProductInput, req.user!.id);
  res.json({ data: product });
}

export async function searchHandler(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const statuses = typeof req.query.statuses === "string"
    ? req.query.statuses.split(",").filter(Boolean)
    : ["IN_STOCK"];
  res.json({ data: await searchProducts(q, statuses) });
}

export async function bulkDeleteHandler(req: Request, res: Response) {
  if (req.user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
  const ids = (req.body?.ids ?? []) as string[];
  const result = await bulkDeleteProducts(ids, req.user!.id);
  res.json({ data: result });
}

export async function importHandler(req: Request, res: Response) {
  if (req.user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
  const rows = req.body.products as ImportProductInput[];
  const result = await importProducts(rows, req.user!.id);
  res.json({ data: result });
}
