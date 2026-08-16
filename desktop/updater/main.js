"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");

const OWNER = "mykopk";
const REPO = "Mobile-Shop-POS";
const SETUP_PATTERN = /-Setup-\d+\.\d+\.\d+\.exe$/;

let mainWindow = null;
const logPath = path.join(os.tmpdir(), "fig-updater.log");
function log(msg) {
  try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 300,
    resizable: false,
    title: "Fig POS Updater",
    backgroundColor: "#f6f5f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "fig-pos-updater" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(20_000, () => req.destroy(new Error("timeout")));
  });
}

function download(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "fig-pos-updater" } }, (res) => {
      if (res.statusCode >= 300) {
        res.resume();
        reject(new Error(`Download failed (HTTP ${res.statusCode})`));
        return;
      }
      const total = Number(res.headers["content-length"] || 0);
      let received = 0;
      res.on("data", (chunk) => {
        received += chunk.length;
        if (total) onProgress(Math.round((received / total) * 100));
      });
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (e) => { file.destroy(); reject(e); });
  });
}

async function run() {
  log("Updater started.");
  send("status", { text: "Checking for updates…", percent: 0 });
  try {
    const release = await requestJson(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`);
    const asset = (release.assets || []).find((a) => SETUP_PATTERN.test(a.name));
    if (!asset) {
      log("No installer asset found in latest release.");
      send("status", { text: "No update installer found.", percent: -1 });
      return;
    }
    log(`Latest version: ${release.tag_name} -> ${asset.name}`);
    send("status", { text: `Downloading ${release.tag_name}…`, percent: 0 });

    const dest = path.join(os.tmpdir(), `fig-${asset.name}`);
    await download(asset.browser_download_url, dest, (p) =>
      send("status", { text: `Downloading ${release.tag_name}… ${p}%`, percent: p })
    );
    log(`Downloaded to ${dest}`);

    send("status", { text: "Launching installer…", percent: 100 });
    // Run the standard NSIS installer so the user sees a normal setup flow.
    // Data lives in AppData, so reinstalling never wipes settings.
    const child = spawn(dest, [], { detached: true, stdio: "ignore" });
    child.on("error", (e) => log("Could not launch installer: " + e.message));
    child.unref();

    send("status", { text: "Installer launched. Close this window.", percent: 100 });
    log("Installer launched.");
  } catch (err) {
    log("Update failed: " + (err && err.stack ? err.stack : err));
    send("status", { text: `Update failed: ${err.message}`, percent: -1 });
  }
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.on("updater:start", () => run());
  ipcMain.handle("updater:log-path", () => logPath);
});

app.on("window-all-closed", () => app.quit());