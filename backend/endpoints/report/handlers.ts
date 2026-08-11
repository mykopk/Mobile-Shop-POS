import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import { ledgerSchema, rangeSchema } from "./schemas";
import * as report from "./service";
import type { Range } from "./service";

function parseRange(req: Request): Range {
  const parsed = rangeSchema.safeParse({ from: req.query.from, to: req.query.to });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(400, "validation_error", first?.message ?? "Invalid range");
  }
  return parsed.data;
}

function parseLedger(req: Request) {
  const parsed = ledgerSchema.safeParse({
    contactId: req.params.contactId,
    from: req.query.from,
    to: req.query.to,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(400, "validation_error", first?.message ?? "Invalid ledger request");
  }
  return parsed.data;
}

export async function summaryHandler(req: Request, res: Response) {
  res.json({ data: await report.summary(req.user!.role, parseRange(req)) });
}

export async function salesHandler(req: Request, res: Response) {
  res.json({ data: await report.salesReport(parseRange(req)) });
}

export async function purchasesHandler(req: Request, res: Response) {
  res.json({ data: await report.purchasesReport(parseRange(req)) });
}

export async function profitHandler(req: Request, res: Response) {
  const role = req.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    res.json({ data: null });
    return;
  }
  res.json({ data: await report.profitReport(parseRange(req)) });
}

export async function expensesHandler(req: Request, res: Response) {
  res.json({ data: await report.expensesReport(parseRange(req)) });
}

export async function stockHandler(req: Request, res: Response) {
  res.json({ data: await report.stockReport(req.user!.role) });
}

export async function paymentsHandler(req: Request, res: Response) {
  res.json({ data: await report.paymentsReport(parseRange(req)) });
}

export async function balancesHandler(req: Request, res: Response) {
  res.json({ data: await report.balances() });
}

export async function ledgerHandler(req: Request, res: Response) {
  const parsed = parseLedger(req);
  res.json({ data: await report.ledgerReport(parsed.contactId, { from: parsed.from, to: parsed.to }) });
}
