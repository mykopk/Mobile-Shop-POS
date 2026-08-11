import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createPrintLayout,
  deletePrintLayout,
  listPrintLayouts,
  setDefaultPrintLayout,
  updatePrintLayout,
} from "./service";
import type { PrintLayoutInput, PrintLayoutUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listPrintLayouts(req.user!.id) });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const layout = await createPrintLayout(req.user!.id, req.body as PrintLayoutInput);
  res.status(201).json({ data: layout });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const layout = await updatePrintLayout(req.params.id, req.user!.id, req.body as PrintLayoutUpdateInput);
  res.json({ data: layout });
}

export async function setDefaultHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const layout = await setDefaultPrintLayout(req.params.id, req.user!.id);
  res.json({ data: layout });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const result = await deletePrintLayout(req.params.id, req.user!.id);
  res.json({ data: result });
}
