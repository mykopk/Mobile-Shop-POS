// Copies the native better-sqlite3 module (+ its runtime deps) into
// dist/node_modules so the bundled backend is self-contained. Run this AFTER
// `npm run rebuild` so the native build matches Electron's ABI.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(dir, "..");
const src = path.join(backend, "node_modules");
const dest = path.join(backend, "dist", "node_modules");

const packages = ["better-sqlite3", "node-addon-api", "bindings", "file-uri-to-path", "node-gyp-build"];

fs.mkdirSync(dest, { recursive: true });
for (const pkg of packages) {
  const from = path.join(src, pkg);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(dest, pkg), { recursive: true });
  }
}
console.log("Copied native runtime deps into dist/node_modules");
