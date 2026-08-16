"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("updater", {
  start: () => ipcRenderer.send("updater:start"),
  onStatus: (cb) => ipcRenderer.on("status", (_e, s) => cb(s)),
  logPath: () => ipcRenderer.invoke("updater:log-path"),
});