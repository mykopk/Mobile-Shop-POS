"use strict";

// Sends crash / error reports to a GitHub repository as Issues. The token is
// NEVER hardcoded or committed — it comes from the environment, the user's
// Settings, or a token file baked in at build time (see fig-report-token.txt,
// which is gitignored).

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_REPO = "mykopk/Mobile-Shop-POS";

function repoFor(cfg) {
  const custom = cfg && cfg.repo && cfg.repo.trim();
  if (custom) return custom.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  return process.env.FIG_GH_REPO || DEFAULT_REPO;
}

function tokenFile() {
  const f = path.join(__dirname, "fig-report-token.txt");
  try {
    const s = fs.readFileSync(f, "utf8").trim();
    return s || "";
  } catch {
    return "";
  }
}

function tokenFor(cfg) {
  if (cfg && cfg.token && String(cfg.token).trim()) return String(cfg.token).trim();
  return process.env.FIG_GH_TOKEN || tokenFile();
}

async function submit({ cfg, title, body }) {
  const tok = tokenFor(cfg);
  if (!tok) return { sent: false, reason: "no-token" };
  const url = `https://api.github.com/repos/${repoFor(cfg)}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Fig-Mobile-POS",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return { sent: true, url: (await res.json()).html_url };
}

module.exports = { submit, repoFor };