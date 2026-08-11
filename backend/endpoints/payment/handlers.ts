import type { Request, Response } from "express";
import { collectCredit } from "./service";
import type { CollectInput } from "./schemas";

export async function collectHandler(req: Request, res: Response) {
  res.json({ data: await collectCredit(req.body as CollectInput, req.user!.id) });
}
