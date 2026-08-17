import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prisma } from "./prisma";
import { env } from "../config/env";

export type BackupConfig = {
  enabled: boolean;
  directory: string;
  intervalHours: number;
  retention: number;
};

const CONFIG_KEY = "backup.config";
const DEFAULT_DIRECTORY = () => resolve(process.cwd(), "backups");

export function defaultBackupConfig(): BackupConfig {
  return {
    enabled: env.AUTO_BACKUP_ON_START,
    directory: DEFAULT_DIRECTORY(),
    intervalHours: env.BACKUP_INTERVAL_HOURS,
    retention: env.BACKUP_RETENTION,
  };
}

export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const row = await prisma.settings.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) return defaultBackupConfig();
    const parsed = JSON.parse(row.value) as Partial<BackupConfig>;
    const base = defaultBackupConfig();
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : base.enabled,
      directory: parsed.directory?.trim() ? parsed.directory : base.directory,
      intervalHours: Number.isFinite(parsed.intervalHours) && (parsed.intervalHours ?? 0) > 0
        ? parsed.intervalHours!
        : base.intervalHours,
      retention: Number.isFinite(parsed.retention) && (parsed.retention ?? 0) > 0
        ? parsed.retention!
        : base.retention,
    };
  } catch {
    return defaultBackupConfig();
  }
}

export async function saveBackupConfig(input: Partial<BackupConfig>): Promise<BackupConfig> {
  const current = await getBackupConfig();
  const next: BackupConfig = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    directory: input.directory?.trim() ? input.directory : current.directory,
    intervalHours: Number.isFinite(input.intervalHours) && (input.intervalHours ?? 0) > 0
      ? input.intervalHours!
      : current.intervalHours,
    retention: Number.isFinite(input.retention) && (input.retention ?? 0) > 0
      ? input.retention!
      : current.retention,
  };
  await prisma.settings.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: CONFIG_KEY, value: JSON.stringify(next) },
  });
  return next;
}

export function backupsDir() {
  return resolve(process.cwd(), "backups");
}

async function currentBackupsDir(): Promise<string> {
  const cfg = await getBackupConfig();
  const dir = cfg.directory?.trim() ? resolve(cfg.directory) : backupsDir();
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* fall back to default dir below */
  }
  return existsSync(dir) ? dir : backupsDir();
}

export async function writeBackup(): Promise<string> {
  const backup = join(tmpdir(), `fig-backup-${Date.now()}.db`);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    const dir = await currentBackupsDir();
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const target = join(dir, `fig-${stamp}.db`);
    writeFileSync(target, readFileSync(backup));
    return target;
  } finally {
    rmSync(backup, { force: true });
  }
}

export async function pruneBackups(keep = env.BACKUP_RETENTION) {
  const dir = await currentBackupsDir();
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".db")).sort();
  } catch {
    return;
  }
  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    rmSync(join(dir, files[i]), { force: true });
  }
}

export async function runBackup(): Promise<string | null> {
  try {
    const file = await writeBackup();
    const cfg = await getBackupConfig();
    await pruneBackups(cfg.retention);
    return file;
  } catch (err) {
    console.warn("Automatic backup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function scheduleBackups() {
  let lastRun = Date.now();
  let onStartDone = false;
  const timer = setInterval(() => {
    void (async () => {
      try {
        const cfg = await getBackupConfig();
        if (!cfg.enabled) return;
        // Run once shortly after startup, then on the interval.
        if (!onStartDone) {
          onStartDone = true;
          lastRun = Date.now();
          await runBackup();
          return;
        }
        if (Date.now() - lastRun >= cfg.intervalHours * 3_600_000) {
          lastRun = Date.now();
          await runBackup();
        }
      } catch (err) {
        console.warn("Scheduled backup check failed:", err instanceof Error ? err.message : err);
      }
    })();
  }, 60_000);
  timer.unref();
  return timer;
}