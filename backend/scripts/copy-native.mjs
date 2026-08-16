// Copies the native better-sqlite3 module (+ its runtime deps) into
// dist/native so the bundled backend is self-contained. Run this AFTER
// `npm run rebuild` so the native build matches Electron's ABI.
//
// We deliberately do NOT use a folder named "node_modules": electron-builder
// prunes node_modules inside extraResources, but a plain folder is copied
// as-is. The bundled setup.cjs/server.cjs resolve it via NODE_PATH.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(dir, "..");
const src = path.join(backend, "node_modules");
const dest = path.join(backend, "dist", "native");

const packages = ["better-sqlite3", "node-addon-api", "bindings", "file-uri-to-path", "node-gyp-build"];

fs.mkdirSync(dest, { recursive: true });
for (const pkg of packages) {
  const from = path.join(src, pkg);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(dest, pkg), { recursive: true });
  }
}

const sqliteDir = path.join(dest, "better-sqlite3");
const hasBinary = fs.existsSync(path.join(sqliteDir, "build", "Release")) || fs.existsSync(path.join(sqliteDir, "prebuilds"));
if (!hasBinary) {
  throw new Error("better-sqlite3 has no compiled native binary in " + sqliteDir + " — run npm run rebuild first");
}
console.log("Copied native runtime deps into dist/native (better-sqlite3 binary present)");
