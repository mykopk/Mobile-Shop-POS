import { env } from "./core/config/env";
import { prisma } from "./core/lib/prisma";
import { createApp } from "./app";
import { seedPrintLayouts } from "./endpoints/print-layout/seed";

const app = createApp();

async function bootstrap() {
  try {
    const seeded = await seedPrintLayouts();
    console.log(`Seeded ${seeded.length} premade print layout(s)`);
  } catch (err) {
    console.warn("Premade print layouts were not seeded:", err instanceof Error ? err.message : err);
  }
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `Fig Mobile POS API listening on http://${env.HOST}:${env.PORT}`,
    );
  });

  function shutdown(signal: string) {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      prisma.$disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap();
