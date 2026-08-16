import { env } from "./core/config/env";
import { prisma } from "./core/lib/prisma";
import { createApp } from "./app";
import { seedPrintLayouts } from "./endpoints/print-layout/seed";
import { seedCities } from "./endpoints/city/seed";
import { seedBrands } from "./endpoints/brand/seed";
import { seedCategories } from "./endpoints/category/seed";
import { seedColors } from "./endpoints/color/seed";
import { scheduleBackups } from "./core/lib/backup";
import { checkWeakPins } from "./core/lib/security";

const app = createApp();

async function bootstrap() {
  try {
    const seeded = await seedPrintLayouts();
    console.log(`Seeded ${seeded.length} premade print layout(s)`);
  } catch (err) {
    console.warn("Premade print layouts were not seeded:", err instanceof Error ? err.message : err);
  }
  try {
    const seededCities = await seedCities();
    console.log(`Seeded ${seededCities.length} new city/cities`);
  } catch (err) {
    console.warn("Cities were not seeded:", err instanceof Error ? err.message : err);
  }
  try {
    const seededCategories = await seedCategories();
    const seededBrands = await seedBrands();
    const seededColors = await seedColors();
    console.log(
      `Seeded ${seededCategories.length} new category/categories, ${seededBrands.length} new brand(s), ${seededColors.length} new color(s)`,
    );
  } catch (err) {
    console.warn("Catalog defaults were not seeded:", err instanceof Error ? err.message : err);
  }
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `Fig Mobile POS API listening on http://${env.HOST}:${env.PORT}`,
    );
  });

  scheduleBackups();
  void checkWeakPins();

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
