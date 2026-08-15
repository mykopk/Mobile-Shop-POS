import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prisma } from "../../core/lib/prisma";
import { env } from "../../core/config/env";

function dbPath() {
  const file = env.DATABASE_URL.replace(/^file:/, "");
  return resolve(process.cwd(), file);
}

export async function exportBackup(): Promise<Buffer> {
  const backup = join(tmpdir(), `fig-backup-${Date.now()}.db`);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    return readFileSync(backup);
  } finally {
    rmSync(backup, { force: true });
  }
}

export async function restoreBackup(buffer: Buffer): Promise<void> {
  const target = dbPath();
  await prisma.$disconnect();
  writeFileSync(target, buffer);
  await prisma.$connect();
}
