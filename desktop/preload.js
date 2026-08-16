"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fig", {
  isElectron: true,
  platform: process.platform,
  runtime: {
    get: () => ipcRenderer.invoke("runtime:get"),
    set: (cfg) => ipcRenderer.invoke("runtime:set", cfg),
  },
});