import type { Request, Response } from "express";
import { getSetupStatus, runSetup } from "./service";
import type { SetupInput } from "./schemas";

export async function statusHandler(_req: Request, res: Response) {
  res.json({ data: await getSetupStatus() });
}

export async function setupHandler(req: Request, res: Response) {
  res.status(201).json({ data: await runSetup(req.body as SetupInput) });
}