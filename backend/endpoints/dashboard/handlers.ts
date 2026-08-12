import type { Request, Response } from "express";
import { getCompanyTimezone } from "../../core/lib/company";
import { activityLog, overview } from "./service";

export async function overviewHandler(req: Request, res: Response) {
  res.json({ data: await overview(req.user!.permissions, await getCompanyTimezone()) });
}

export async function activityHandler(req: Request, res: Response) {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  res.json({ data: await activityLog(limit) });
}
