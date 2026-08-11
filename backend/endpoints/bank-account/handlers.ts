import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  setDefaultBankAccount,
  updateBankAccount,
} from "./service";
import type { BankAccountInput, BankAccountUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listBankAccounts() });
}

export async function createHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const account = await createBankAccount(req.body as BankAccountInput, req.user!.id);
  res.status(201).json({ data: account });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const account = await updateBankAccount(req.params.id, req.body as BankAccountUpdateInput, req.user!.id);
  res.json({ data: account });
}

export async function setDefaultHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const account = await setDefaultBankAccount(req.params.id, req.user!.id);
  res.json({ data: account });
}

export async function deleteHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const result = await deleteBankAccount(req.params.id, req.user!.id);
  res.json({ data: result });
}
