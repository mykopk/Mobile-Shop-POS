import type { Request, Response } from "express";
import { getCompanyTimezone } from "../../core/lib/company";
import { activityLog, overview, saveWidgets, widgets, type DashboardRange } from "./service";
import { updateDashboardWidgetsSchema } from "./schemas";

export async function overviewHandler(req: Request, res: Response) {
  const range: DashboardRange = {
    from: typeof req.query.from === "string" && req.query.from ? req.query.from : undefined,
    to: typeof req.query.to === "string" && req.query.to ? req.query.to : undefined,
  };
  res.json({ data: await overview(req.user!.permissions, await getCompanyTimezone(), range) });
}

export async function activityHandler(req: Request, res: Response) {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  res.json({ data: await activityLog(limit) });
}

export async function widgetsHandler(req: Request, res: Response) {
  res.json({ data: await widgets(req.user!.id) });
}

export async function updateWidgetsHandler(req: Request, res: Response) {
  const parsed = updateDashboardWidgetsSchema.parse(req.body);
  res.json({ data: await saveWidgets(req.user!.id, parsed.widgets) });
}
