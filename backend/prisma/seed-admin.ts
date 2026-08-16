import bcrypt from "bcryptjs";
import { prisma } from "../core/lib/prisma";
import { env } from "../core/config/env";

// Creates only the admin user on a fresh install (used by the desktop app's
// first-run). Requires SEED_PIN_ADMIN (or SEED_PIN_ARSLAN). No demo data.
async function main() {
  const pin = process.env.SEED_PIN_ADMIN ?? process.env.SEED_PIN_ARSLAN;
  if (!pin) {
    console.error("SEED_PIN_ADMIN is required (or SEED_PIN_ARSLAN).");
    process.exit(1);
  }
  const username = (process.env.SEED_ADMIN_USERNAME ?? "ADMIN").toUpperCase();
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";
  const email = process.env.SEED_ADMIN_EMAIL ?? `admin@${username.toLowerCase()}.local`;
  const pinHash = await bcrypt.hash(pin, env.BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { username },
    // Existing admin keeps its current PIN — never reset it on re-run.
    update: { name, email, role: "ADMIN", active: true },
    create: { username, name, email, pinHash, role: "ADMIN", active: true },
  });
  console.log(`Created admin user "${username}" with PIN ${pin}`);
}

void main().finally(() => prisma.$disconnect());