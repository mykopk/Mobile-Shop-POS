import type { Request, Response } from "express";
import {
  closeSession,
  getCurrentSession,
  listSessions,
  openSession,
} from "./service";
import type { CloseCashSessionInput, OpenCashSessionInput } from "./schemas";

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listSessions() });
}

export async function currentHandler(req: Request, res: Response) {
  res.json({ data: await getCurrentSession() });
}

export async function openHandler(req: Request, res: Response) {
  const session = await openSession(req.body as OpenCashSessionInput, req.user!.id);
  res.status(201).json({ data: session });
}

export async function closeHandler(req: Request, res: Response) {
  const session = await closeSession(req.params.id, req.body as CloseCashSessionInput, req.user!.id);
  res.json({ data: session });
}
