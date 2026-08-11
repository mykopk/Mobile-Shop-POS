import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createColor,
  deactivateColor,
  deleteColor,
  listColors,
  updateColor,
} from "./service";
import type { ColorInput, ColorUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listColors() });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const color = await createColor(req.body as ColorInput, req.user!.id);
  res.status(201).json({ data: color });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const color = await updateColor(req.params.id, req.body as ColorUpdateInput, req.user!.id);
  res.json({ data: color });
}

export async function deactivateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const color = await deactivateColor(req.params.id, req.user!.id);
  res.json({ data: color });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const result = await deleteColor(req.params.id, req.user!.id);
  res.json({ data: result });
}
