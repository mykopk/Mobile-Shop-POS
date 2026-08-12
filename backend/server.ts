import { env } from "./core/config/env";
import { prisma } from "./core/lib/prisma";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `DOST Mobile POS API listening on http://${env.HOST}:${env.PORT}`,
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
