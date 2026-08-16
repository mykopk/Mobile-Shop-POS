"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT, "backend");
const FRONTEND_DIR = path.join(ROOT, "frontend");

const DEV_ATTACH = process.argv.includes("--dev");
const BACKEND_PORT = Number(process.env.FIG_BACKEND_PORT || 4701);
const FRONTEND_PORT = Number(process.env.FIG_FRONTEND_PORT || 3100);

const DEFAULT_RUNTIME = { mode: "local", hostedUrl: "" };

const children = new Set();
let mainWindow = null;

// ---------------------------------------------------------------------------
// Runtime config (local server vs hosted URL), stored in the user data dir so
// it can be switched at runtime from Settings.
// ---------------------------------------------------------------------------
function userDataDir() {
  return app.getPath("userData");
}

function runtimeFile() {
  return path.join(userDataDir(), "fig-runtime.json");
}

function loadRuntime() {
  try {
    return { ...DEFAULT_RUNTIME, ...JSON.parse(fs.readFileSync(runtimeFile(), "utf8")) };
  } catch {
    return { ...DEFAULT_RUNTIME };
  }
}

function saveRuntime(cfg) {
  fs.mkdirSync(userDataDir(), { recursive: true });
  fs.writeFileSync(runtimeFile(), JSON.stringify(cfg, null, 2));
}

function getSecret() {
  const f = path.join(userDataDir(), "fig-secret.txt");
  try {
    const s = fs.readFileSync(f, "utf8").trim();
    if (s.length >= 16) return s;
  } catch {
    /* first run */
  }
  const s = randomBytes(32).toString("hex");
  fs.mkdirSync(userDataDir(), { recursive: true });
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}

function dbPath() {
  return app.isPackaged
    ? path.join(userDataDir(), "data", "fig.db")
    : path.join(BACKEND_DIR, "data", "fig.db");
}

// ---------------------------------------------------------------------------
// Child processes (local mode). Children are spawned with Electron's Node so
// a packaged app never depends on a system Node install. Native deps must be
// rebuilt for Electron's ABI (npm run rebuild) before packaging.
// ---------------------------------------------------------------------------
function runNode(args, { cwd, env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`child exited with code ${code}`)),
    );
  });
}

async function ensureDatabase() {
  const db = dbPath();
  if (fs.existsSync(db)) return;

  fs.mkdirSync(path.dirname(db), { recursive: true });
  console.log(`First run — creating fresh database at ${db}`);
  const prismaCli = path.join(BACKEND_DIR, "node_modules", "prisma", "build", "index.js");
  await runNode([prismaCli, "db", "push", "--skip-generate"], {
    cwd: BACKEND_DIR,
    env: { DATABASE_URL: `file:${db}` },
  });
  await seedAdminUser(db);
}

// Fresh installs start with an EMPTY database and a single admin user with a
// generated PIN (never a trivial one). Credentials are written to the OS
// user-data dir and printed to the console.
async function seedAdminUser(db) {
  const tsx = path.join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  const pin = randomPin();
  await runNode([tsx, "prisma/seed-admin.ts"], {
    cwd: BACKEND_DIR,
    env: {
      DATABASE_URL: `file:${db}`,
      SEED_PIN_ADMIN: pin,
      SEED_ADMIN_NAME: process.env.FIG_ADMIN_NAME || "Administrator",
    },
  });
  const credsFile = path.join(userDataDir(), "fig-first-run.txt");
  fs.writeFileSync(
    credsFile,
    `Fig Mobile POS — administrator login\nUsername: ADMIN\nPIN: ${pin}\n\nChange this in Settings > Users.\n`,
  );
  console.log(`Admin user created. Credentials saved to ${credsFile}`);
}

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6);
}

function spawnBackend() {
  const tsx = path.join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsx, "server.ts"], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(BACKEND_PORT),
      HOST: "localhost",
      NODE_ENV: "production",
      DATABASE_URL: `file:${dbPath()}`,
      JWT_SECRET: getSecret(),
      CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
      AUTO_BACKUP_ON_START: process.env.FIG_AUTO_BACKUP || "true",
      BACKUP_INTERVAL_HOURS: process.env.FIG_BACKUP_INTERVAL_HOURS || "24",
      BACKUP_RETENTION: process.env.FIG_BACKUP_RETENTION || "14",
      FIG_DESKTOP: "1",
    },
    stdio: "inherit",
  });
  return child;
}

function spawnFrontend() {
  const nextBin = path.join(FRONTEND_DIR, "node_modules", "next", "dist", "bin", "next");
  const hasProdBuild = fs.existsSync(path.join(FRONTEND_DIR, ".next", "BUILD_ID"));
  const cmd = hasProdBuild ? "start" : "dev";
  const child = spawn(process.execPath, [nextBin, cmd, "-p", String(FRONTEND_PORT), "-H", "localhost"], {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(FRONTEND_PORT),
      BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
    },
    stdio: "inherit",
  });
  return child;
}

function track(child) {
  children.add(child);
  child.on("exit", () => children.delete(child));
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: "Fig Mobile POS",
    backgroundColor: "#f6f5f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    if (/^https?:\/\//.test(u)) shell.openExternal(u);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, u) => {
    if (u.startsWith(url)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(u)) shell.openExternal(u);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function waitForHealth(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(tick, 750);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(tick, 750);
      });
      req.on("error", () => setTimeout(tick, 750));
    };
    tick();
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  ipcMain.handle("runtime:get", () => loadRuntime());

  ipcMain.handle("runtime:set", (_event, cfg) => {
    const next = {
      mode: cfg && cfg.mode === "hosted" ? "hosted" : "local",
      hostedUrl: cfg && cfg.mode === "hosted" ? String(cfg.hostedUrl || "").trim() : "",
    };
    saveRuntime(next);
    app.relaunch();
    app.exit(0);
    return next;
  });

  app.whenReady().then(async () => {
    const cfg = loadRuntime();
    let url;

    if (DEV_ATTACH) {
      // Attach to already-running dev servers (frontend + backend) without
      // spawning anything: e.g. FIG_FRONTEND_URL=http://localhost:3000.
      url = process.env.FIG_FRONTEND_URL || "http://localhost:3000";
    } else if (cfg.mode === "hosted") {
      if (!/^https?:\/\//.test(cfg.hostedUrl)) {
        console.error("Hosted mode is selected but the URL is missing/invalid. Open Settings in local mode to fix it.");
        app.exit(1);
        return;
      }
      url = cfg.hostedUrl;
    } else {
      try {
        await ensureDatabase();
      } catch (err) {
        console.error("Could not prepare the local database:", err);
        app.exit(1);
        return;
      }
      track(spawnBackend());
      track(spawnFrontend());
      url = `http://localhost:${FRONTEND_PORT}`;
      try {
        await waitForHealth(`${url}/api/health`, 120_000);
      } catch (err) {
        console.error("Frontend/backend did not come up in time:", err);
        app.exit(1);
        return;
      }
    }

    createWindow(url);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && url) createWindow(url);
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    for (const child of children) {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    }
  });

  app.on("quit", () => {
    for (const child of children) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  });
}