import bcrypt from "bcryptjs";
import { env } from "../core/config/env";
import { prisma } from "../core/lib/prisma";
import type { Role } from "../generated/prisma/enums";

const DEMO_USERS: {
  username: string;
  name: string;
  email: string;
  pin: string;
  role: Role;
}[] = [
  {
    username: "arslan",
    name: "Arslan Wahab",
    email: "admin@dost.com",
    pin: "1111",
    role: "ADMIN",
  },
  {
    username: "saima",
    name: "Saima Riaz",
    email: "manager@dost.com",
    pin: "2222",
    role: "MANAGER",
  },
  {
    username: "ali",
    name: "Ali Hassan",
    email: "cashier@dost.com",
    pin: "3333",
    role: "CASHIER",
  },
];

async function main() {
  for (const demo of DEMO_USERS) {
    const pinHash = await bcrypt.hash(demo.pin, env.BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { username: demo.username },
      update: {
        name: demo.name,
        email: demo.email,
        pinHash,
        role: demo.role,
        active: true,
      },
      create: {
        username: demo.username,
        name: demo.name,
        email: demo.email,
        pinHash,
        role: demo.role,
      },
    });
  }
  console.log(`Seeded ${DEMO_USERS.length} users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
