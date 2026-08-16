"use strict";

const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const logging = require("./logging");
const report = require("./report");
const { autoUpdater } = require("electron-updater");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT, "backend");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const NATIVE_DIR = path.join(BACKEND_DIR, "dist", "native");

const DEV_ATTACH = process.argv.includes("--dev");
const BACKEND_PORT = Number(process.env.FIG_BACKEND_PORT || 4701);
const FRONTEND_PORT = Number(process.env.FIG_FRONTEND_PORT || 3100);

const DEFAULT_RUNTIME = { mode: "local", hostedUrl: "", report: { enabled: true, token: "", repo: "" } };

const children = new Set();
let mainWindow = null;

// ---------------------------------------------------------------------------
// OTA self-update. Installed builds check GitHub Releases once at startup,
// download any newer version in the background, and install on quit so the
// user never has to re-download the installer.
// ---------------------------------------------------------------------------
function checkForUpdates() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => logging.write("OTA: checking for updates…"));
  autoUpdater.on("update-available", (info) =>
    logging.write(`OTA: update available (${info.version}) — downloading…`)
  );
  autoUpdater.on("update-not-available", (info) =>
    logging.write(`OTA: no update available (latest ${info.version}).`)
  );
  autoUpdater.on("update-downloaded", (info) => {
    logging.write(`OTA: update ${info.version} downloaded — will install on quit.`);
    try {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Restart & update now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Fig Mobile POS — Update ready",
        message: `Version ${info.version} is ready to install.`,
        detail: "Restart now to apply the update, or choose Later to install it the next time you quit the app.",
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      }).catch(() => {});
    } catch (e) {
      logging.error("OTA: could not show update dialog: " + e.message);
    }
  });
  autoUpdater.on("error", (err) => logging.error("OTA: " + (err && err.message ? err.message : err)));

  autoUpdater.checkForUpdates().catch((err) =>
    logging.write(`OTA: check failed (silent): ${err.message}`)
  );
}

// ---------------------------------------------------------------------------
// Logging + crash surfacing. Everything is written to a log file in the
// user-data dir so a packaged app can always explain *why* it failed even
// though there is no terminal on Windows.
// ---------------------------------------------------------------------------
try {
  logging.init(app.getPath("userData"));
} catch {
  /* userData not ready yet */
}

function systemInfo() {
  return [
    `App version: ${app.getVersion()}`,
    `Electron: ${process.versions.electron || "?"}`,
    `Node: ${process.versions.node}`,
    `Platform: ${process.platform} ${process.arch}`,
    `OS: ${process.getSystemVersion ? process.getSystemVersion() : process.platform}`,
  ].join("\n");
}

function buildReport(err) {
  const body =
    `${systemInfo()}\n\n` +
    `## Error\n\n\`\`\`\n${err && err.stack ? err.stack : err}\n\`\`\`\n\n` +
    `## Last log lines\n\n\`\`\`\n${logging.tail(150).join("\n")}\n\`\`\`\n`;
  return body;
}

// Send a crash report to GitHub Issues. Opt-in via Settings; the token is never
// hardcoded. Fire-and-forget and fully silent — the user is never told an Issue
// was opened.
function sendReport(title, err) {
  const cfg = loadRuntime();
  if (!cfg.report || !cfg.report.enabled) return;
  report
    .submit({ cfg: cfg.report, title: `[Crash] ${title}`, body: buildReport(err) })
    .catch((e) => logging.write(`[report] failed (silent): ${e.message}`));
}

// Store the latest error so the error window can fetch it and let the user copy it.
let lastErrorDetail = "";
let lastErrorTitle = "Fig Mobile POS encountered an error";

// Show a small window with the error, selectable text, and a Copy button — the
// OS dialog's text is not copyable. A crash report is sent first (silently).
function fatalDialog(title, err) {
  sendReport(title, err);
  lastErrorTitle = title || "Fig Mobile POS encountered an error";
  const logPath = logging.getPath();
  lastErrorDetail =
    `${String(err && err.stack ? err.stack : err)}\n\n` +
    `Log file: ${logPath}\n\n--- last ${50} log lines ---\n${logging.tail(50).join("\n")}`;
  try {
    const win = new BrowserWindow({
      width: 560,
      height: 480,
      resizable: true,
      title: "Fig Mobile POS — Error",
      backgroundColor: "#f6f5f2",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.loadFile(path.join(__dirname, "error.html"), { query: { t: encodeURIComponent(lastErrorTitle) } });
  } catch {
    /* ignore */
  }
}

process.on("uncaughtException", (err) => {
  logging.error("Uncaught exception: " + (err && err.stack ? err.stack : err));
  fatalDialog("Fig Mobile POS crashed", err);
  app.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logging.error("Unhandled rejection: " + (reason && reason.stack ? reason.stack : reason));
});

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
    const data = JSON.parse(fs.readFileSync(runtimeFile(), "utf8"));
    return {
      ...DEFAULT_RUNTIME,
      ...data,
      report: { ...DEFAULT_RUNTIME.report, ...(data.report || {}) },
    };
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
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_PATH: NATIVE_DIR, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    logging.childStream(child, "setup");
    child.on("error", (err) => {
      logging.error(`child spawn error: ${err.message}`);
      reject(err);
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`child exited with code ${code}`)),
    );
  });
}

async function ensureDatabase(onStatus) {
  const db = dbPath();
  if (fs.existsSync(db)) return;

  fs.mkdirSync(path.dirname(db), { recursive: true });
  console.log(`First run — creating fresh database at ${db}`);
  const setup = path.join(BACKEND_DIR, "dist", "setup.cjs");
  const schema = path.join(BACKEND_DIR, "dist", "schema.sql");
  if (fs.existsSync(setup) && fs.existsSync(schema)) {
    onStatus && onStatus("Creating database tables…");
    await runNode([setup, db, schema], { cwd: BACKEND_DIR });
  } else if (!app.isPackaged) {
    const prismaCli = path.join(BACKEND_DIR, "node_modules", "prisma", "build", "index.js");
    await runNode([prismaCli, "db", "push", "--skip-generate"], {
      cwd: BACKEND_DIR,
      env: { DATABASE_URL: `file:${db}` },
    });
  } else {
    throw new Error(
      `Database setup files missing in the app bundle. Expected ${setup} and ${schema}.`,
    );
  }
  await seedAdminUser(db, onStatus);
}

// Copy bundled data files (e.g. print-layouts.json) into the user-data dir so
// the backend can find them when it runs from there.
function ensureBackendData() {
  const dataDir = path.join(userDataDir(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const bundled = path.join(BACKEND_DIR, "data", "print-layouts.json");
  if (fs.existsSync(bundled)) {
    const dest = path.join(dataDir, "print-layouts.json");
    if (!fs.existsSync(dest)) fs.copyFileSync(bundled, dest);
  }
}

// Fresh installs start with an EMPTY database and a single admin user with a
// generated PIN (never a trivial one). Credentials are written to the OS
// user-data dir and printed to the console.
async function seedAdminUser(db, onStatus) {
  onStatus && onStatus("Creating administrator account…");
  const pin = randomPin();
  const env = {
    DATABASE_URL: `file:${db}`,
    SEED_PIN_ADMIN: pin,
    SEED_ADMIN_NAME: process.env.FIG_ADMIN_NAME || "Administrator",
  };
  const bundled = path.join(BACKEND_DIR, "dist", "seed-admin.cjs");
  if (fs.existsSync(bundled)) {
    await runNode([bundled], { cwd: BACKEND_DIR, env });
  } else {
    const tsx = path.join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
    await runNode([tsx, "prisma/seed-admin.ts"], { cwd: BACKEND_DIR, env });
  }
  const credsFile = path.join(userDataDir(), "fig-first-run.txt");
  fs.writeFileSync(
    credsFile,
    `Fig Mobile POS — administrator login\nUsername: ADMIN\nPIN: ${pin}\n\nChange this in Settings > Users.\n`,
  );
  console.log(`Admin user created. Credentials saved to ${credsFile}`);
}

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function spawnBackend() {
  const baseEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_PATH: NATIVE_DIR,
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
  };

  // Prefer the compiled backend bundle; fall back to tsx for development.
  const bundled = path.join(BACKEND_DIR, "dist", "server.cjs");
  if (fs.existsSync(bundled)) {
    // Run the backend from the user-data dir so backups and any data files it
    // writes persist outside Program Files (which is wiped on app updates).
    const child = spawn(process.execPath, [bundled], { cwd: userDataDir(), env: baseEnv, stdio: ["ignore", "pipe", "pipe"] });
    logging.childStream(child, "backend");
    return child;
  }

  const tsx = path.join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsx, "server.ts"], {
    cwd: BACKEND_DIR,
    env: baseEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  logging.childStream(child, "backend");
  return child;
}

function spawnFrontend() {
  // Prefer the Next.js "standalone" server. In the packaged app it lives at
  // <resources>/frontend/server.js; in the repo it is .next/standalone/server.js.
  const standalone = fs.existsSync(path.join(FRONTEND_DIR, "server.js"))
    ? path.join(FRONTEND_DIR, "server.js")
    : path.join(FRONTEND_DIR, ".next", "standalone", "server.js");
  if (fs.existsSync(standalone)) {
    prepareStandalone(path.dirname(standalone));
    const child = spawn(process.execPath, [standalone], {
      cwd: path.dirname(standalone),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_PATH: path.join(FRONTEND_DIR, "deps"),
        PORT: String(FRONTEND_PORT),
        HOSTNAME: "localhost",
        BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    logging.childStream(child, "frontend");
    return child;
  }

  // Fallback for development (no standalone build): next dev / next start.
  const nextBin = path.join(FRONTEND_DIR, "node_modules", "next", "dist", "bin", "next");
  const hasProdBuild = fs.existsSync(path.join(FRONTEND_DIR, ".next", "BUILD_ID"));
  const cmd = hasProdBuild ? "start" : "dev";
  const child = spawn(process.execPath, [nextBin, cmd, "-p", String(FRONTEND_PORT), "-H", "localhost"], {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_PATH: path.join(FRONTEND_DIR, "deps"),
      PORT: String(FRONTEND_PORT),
      BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  logging.childStream(child, "frontend");
  return child;
}

// The standalone output needs its static assets and public files alongside it.
// In the packaged app those are already placed there, so this is a no-op.
function prepareStandalone(standDir) {
  const staticDest = path.join(standDir, ".next", "static");
  const staticSrc = path.join(FRONTEND_DIR, ".next", "static");
  if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }
  const publicDest = path.join(standDir, "public");
  const publicSrc = path.join(FRONTEND_DIR, "public");
  if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
    fs.mkdirSync(path.dirname(publicDest), { recursive: true });
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }
}

function track(child) {
  children.add(child);
  child.on("exit", (code) => {
    children.delete(child);
    if (code && code !== 0) logging.error(`child exited unexpectedly with code ${code}`);
  });
  child.on("error", (err) => logging.error(`child error: ${err.message}`));
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
// Loading screen shown immediately while DB setup + servers boot. It swaps to
// the real app URL once everything is healthy, so first run never looks dead.
function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    title: "Fig Mobile POS",
    backgroundColor: "#f6f5f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, "loading.html"));
  return win;
}

function createWindow(url) {
  if (!mainWindow) {
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

  ipcMain.handle("report:get", () => {
    const r = loadRuntime().report || {};
    return { enabled: Boolean(r.enabled), repo: r.repo || "", hasToken: Boolean(r.token) };
  });

  ipcMain.handle("report:set", (_event, cfg) => {
    const rt = loadRuntime();
    const next = rt.report || {};
    const clean = {
      enabled: Boolean(cfg && cfg.enabled),
      repo: cfg && cfg.repo ? String(cfg.repo).trim() : "",
      token: cfg && cfg.token ? String(cfg.token).trim() : next.token || "",
    };
    saveRuntime({ ...rt, report: clean });
    return { enabled: clean.enabled, repo: clean.repo, hasToken: Boolean(clean.token) };
  });

  ipcMain.handle("logs:get", () => logging.tail(500));

  ipcMain.handle("logs:open", () => {
    const dir = path.dirname(logging.getPath() || "");
    if (dir) shell.openPath(dir);
    return true;
  });

  // Launch the standalone updater if it sits next to the app; otherwise open
  // the GitHub releases page where Fig-POS-Updater.exe can be downloaded.
  ipcMain.handle("update:launch", () => {
    try {
      const dir = path.dirname(process.execPath);
      const updater = fs.readdirSync(dir).find((f) => /^Fig-POS-Updater-.*\.exe$/i.test(f));
      if (updater) {
        spawn(path.join(dir, updater), [], { detached: true, stdio: "ignore" }).unref();
        return { launched: true };
      }
    } catch {
      /* ignore */
    }
    shell.openExternal("https://github.com/mykopk/Mobile-Shop-POS/releases/latest");
    return { launched: false };
  });

  ipcMain.handle("error:get", () => lastErrorDetail);

  ipcMain.handle("error:copy", (_event, text) => {
    try {
      clipboard.writeText(String(text || ""));
      return true;
    } catch {
      return false;
    }
  });

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

    // Show the loading screen immediately so startup (esp. first run) doesn't
    // look like a frozen/slow open.
    const loadingWin = createLoadingWindow();
    const setStatus = (text) => {
      try {
        if (!loadingWin.isDestroyed()) loadingWin.webContents.send("loading:status", text);
      } catch {
        /* window closed */
      }
    };

    logging.write(`Version ${app.getVersion()} | Electron ${process.versions.electron} | Node ${process.versions.node}`);

    if (DEV_ATTACH) {
      // Attach to already-running dev servers (frontend + backend) without
      // spawning anything: e.g. FIG_FRONTEND_URL=http://localhost:3000.
      url = process.env.FIG_FRONTEND_URL || "http://localhost:3000";
    } else if (cfg.mode === "hosted") {
      if (!/^https?:\/\//.test(cfg.hostedUrl)) {
        logging.error("Hosted mode is selected but the URL is missing/invalid.");
        fatalDialog("Fig Mobile POS could not start", "Hosted mode is selected but the URL is missing/invalid. Open Settings in local mode to fix it.");
        app.exit(1);
        return;
      }
      url = cfg.hostedUrl;
    } else {
      setStatus("Preparing app data folder…");
      try {
        await ensureDatabase(setStatus);
      } catch (err) {
        logging.error("Could not prepare the local database: " + (err && err.stack ? err.stack : err));
        setStatus("Could not prepare the database.");
        fatalDialog("Could not prepare the local database", err);
        app.exit(1);
        return;
      }
      setStatus("Starting backend server…");
      ensureBackendData();
      track(spawnBackend());
      setStatus("Starting app server…");
      track(spawnFrontend());
      url = `http://localhost:${FRONTEND_PORT}`;
      setStatus("Waiting for server — this can take a few seconds on first run…");
      try {
        await waitForHealth(`${url}/api/health`, 120_000);
      } catch (err) {
        logging.error("Frontend/backend did not come up in time: " + (err && err.stack ? err.stack : err));
        setStatus("Servers did not start in time.");
        fatalDialog("Fig Mobile POS could not start", err);
        app.exit(1);
        return;
      }
    }

    // Open the real (framed) app window, then dismiss the loading screen.
    createWindow(url);
    if (!loadingWin.isDestroyed()) loadingWin.close();

    // OTA: silently check for a newer release and auto-install on quit.
    // Only meaningful for installed builds — skip the unpacked/no-install test
    // bundle (OTA needs the NSIS installer) and always skip dev/hosted mode.
    const unpackedTest = process.execPath.includes("win-unpacked");
    if (app.isPackaged && !DEV_ATTACH && !unpackedTest) checkForUpdates();

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