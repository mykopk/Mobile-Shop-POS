import type { Request, Response } from "express";
import { activityLog, overview } from "./service";

export async function overviewHandler(req: Request, res: Response) {
  res.json({ data: await overview(req.user!.role) });
}

export async function activityHandler(req: Request, res: Response) {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  res.json({ data: await activityLog(limit) });
}
