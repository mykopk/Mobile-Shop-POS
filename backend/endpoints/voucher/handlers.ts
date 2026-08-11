import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  createVoucher,
  getVoucher,
  listVouchers,
  reverseVoucher,
  updateVoucher,
} from "./service";
import type { VoucherInput, VoucherUpdateInput } from "./schemas";

function assertNotCashier(user?: { role?: string }) {
  if (user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
}

export async function listHandler(req: Request, res: Response) {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json({ data: await listVouchers({ type, status }) });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getVoucher(req.params.id) });
}

export async function createHandler(req: Request, res: Response) {
  const voucher = await createVoucher(req.body as VoucherInput, req.user!.id);
  res.status(201).json({ data: voucher });
}

export async function updateHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const voucher = await updateVoucher(req.params.id, req.body as VoucherUpdateInput, req.user!.id);
  res.json({ data: voucher });
}

export async function reverseHandler(req: Request, res: Response) {
  assertNotCashier(req.user);
  const note = (req.body as { note?: string }).note;
  const voucher = await reverseVoucher(req.params.id, note, req.user!.id);
  res.json({ data: voucher });
}
