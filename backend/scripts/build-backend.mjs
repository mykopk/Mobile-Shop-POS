// Bundles the backend into a self-contained dist/ folder:
//   dist/server.cjs       — the whole API (Prisma runtime, Express, etc. inlined)
//   dist/schema.sql       — CREATE TABLE statements for a fresh database
//   dist/setup.cjs        — applies schema.sql (run on first launch)
// Only better-sqlite3 (native) stays external and is copied into
// dist/node_modules by scripts/copy-native.mjs.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(dir, "..");
const dist = path.join(backend, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// esbuild bundles some deps (Prisma) that read import.meta.url. Since the
// bundle is only ever built for the Windows installer, point it at a Windows-
// valid file URL so fileURLToPath() doesn't throw ERR_INVALID_FILE_URL_PATH.
const define = { "import.meta.url": '"file:///C:/fig/app.cjs"' };
const base = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["better-sqlite3"],
  define,
  logLevel: "info",
};

await build({ ...base, entryPoints: [path.join(backend, "server.ts")], outfile: path.join(dist, "server.cjs") });

const sql = execSync(
  "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  { cwd: backend, encoding: "utf8" },
);
fs.writeFileSync(path.join(dist, "schema.sql"), sql);
fs.copyFileSync(path.join(dir, "setup-db.cjs"), path.join(dist, "setup.cjs"));

console.log("Backend bundled to dist/ (server.cjs, schema.sql, setup.cjs)");
