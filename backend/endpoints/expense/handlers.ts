import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
} from "./service";
import type { ExpenseInput, ExpenseUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  res.json({ data: await listExpenses({ category, from, to }) });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getExpense(req.params.id) });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const expense = await createExpense(req.body as ExpenseInput, req.user!.id);
  res.status(201).json({ data: expense });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const expense = await updateExpense(req.params.id, req.body as ExpenseUpdateInput, req.user!.id);
  res.json({ data: expense });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  await deleteExpense(req.params.id, req.user!.id);
  res.json({ data: { ok: true } });
}
