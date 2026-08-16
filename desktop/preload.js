"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fig", {
  isElectron: true,
  platform: process.platform,
  runtime: {
    get: () => ipcRenderer.invoke("runtime:get"),
    set: (cfg) => ipcRenderer.invoke("runtime:set", cfg),
  },
  report: {
    get: () => ipcRenderer.invoke("report:get"),
    set: (cfg) => ipcRenderer.invoke("report:set", cfg),
  },
  logs: {
    get: () => ipcRenderer.invoke("logs:get"),
    open: () => ipcRenderer.invoke("logs:open"),
  },
  error: {
    get: () => ipcRenderer.invoke("error:get"),
    copy: (text) => ipcRenderer.invoke("error:copy", text),
  },
  loading: {
    onStatus: (cb) => ipcRenderer.on("loading:status", (_event, text) => cb(text)),
  },
});