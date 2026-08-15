import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import { exportBackup, restoreBackup } from "./service";

export async function exportHandler(_req: Request, res: Response) {
  const data = await exportBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="fig-backup-${stamp}.db"`);
  res.send(data);
}

export async function restoreHandler(req: Request, res: Response) {
  const body = req.body;
  const buffer = body instanceof Buffer ? body : undefined;
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, "backup.empty", "No database file provided");
  }
  await restoreBackup(buffer);
  res.json({ data: { ok: true } });
}
