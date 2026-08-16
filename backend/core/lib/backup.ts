import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prisma } from "./prisma";
import { env } from "../config/env";

export function backupsDir() {
  return resolve(process.cwd(), "backups");
}

export async function writeBackup(): Promise<string> {
  const backup = join(tmpdir(), `fig-backup-${Date.now()}.db`);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const target = join(dir, `fig-${stamp}.db`);
    writeFileSync(target, readFileSync(backup));
    return target;
  } finally {
    rmSync(backup, { force: true });
  }
}

export function pruneBackups(keep = env.BACKUP_RETENTION) {
  let files: string[];
  try {
    files = readdirSync(backupsDir()).filter((f) => f.endsWith(".db")).sort();
  } catch {
    return;
  }
  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    rmSync(join(backupsDir(), files[i]), { force: true });
  }
}

export async function runBackup(): Promise<string | null> {
  try {
    const file = await writeBackup();
    pruneBackups();
    console.log(`Backup saved: ${file}`);
    return file;
  } catch (err) {
    console.warn("Automatic backup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function scheduleBackups() {
  if (env.AUTO_BACKUP_ON_START) {
    setTimeout(() => {
      void runBackup();
    }, 2000).unref();
  }
  const timer = setInterval(() => {
    void runBackup();
  }, env.BACKUP_INTERVAL_HOURS * 3_600_000);
  timer.unref();
  return timer;
}