import type { Request, Response } from "express";
import { listAuditLogs, getAuditMeta } from "./service";

function queryString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function listHandler(req: Request, res: Response) {
  const data = await listAuditLogs({
    action: queryString(req.query.action),
    entity: queryString(req.query.entity),
    userId: queryString(req.query.userId),
    search: queryString(req.query.search),
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });
  res.json({ data });
}

export async function metaHandler(_req: Request, res: Response) {
  res.json({ data: await getAuditMeta() });
}
