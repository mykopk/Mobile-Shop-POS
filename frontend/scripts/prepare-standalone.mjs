// Prepares a self-contained frontend bundle for the desktop app by copying the
// Next.js standalone output and renaming its node_modules to "deps".
//
// electron-builder prunes any folder named node_modules inside extraResources,
// which would drop "next" and break the standalone server at runtime. Naming it
// "deps" keeps it intact; the packaged app points NODE_PATH at it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(dir, "..");
const src = path.join(frontend, ".next", "standalone");
const dest = path.join(frontend, "standalone-dist");

if (!fs.existsSync(src)) {
  throw new Error(`Standalone output missing at ${src} — run 'npm run build' first`);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

const nm = path.join(dest, "node_modules");
const deps = path.join(dest, "deps");
if (fs.existsSync(nm)) {
  fs.renameSync(nm, deps);
}

console.log(`Frontend standalone prepared at ${dest} (node_modules renamed to deps)`);