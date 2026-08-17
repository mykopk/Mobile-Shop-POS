import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import { exportBackup, restoreBackup, backupConfig, updateBackupConfig } from "./service";

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

export async function configGetHandler(_req: Request, res: Response) {
  res.json({ data: await backupConfig() });
}

export async function configSaveHandler(req: Request, res: Response) {
  const body = req.body ?? {};
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const directory = typeof body.directory === "string" ? body.directory : undefined;
  const intervalHours = typeof body.intervalHours === "number" ? body.intervalHours : undefined;
  const retention = typeof body.retention === "number" ? body.retention : undefined;
  res.json({ data: await updateBackupConfig({ enabled, directory, intervalHours, retention }) });
}
