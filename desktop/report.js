"use strict";

// Sends crash / error reports to a GitHub repository as Issues. Requires a
// low-privilege token with "issues:write" for the target repo. The token is
// never hardcoded — it comes from the environment or the user's Settings and
// lives in the local user-data dir.

const DEFAULT_REPO = "mykopk/Mobile-Shop-POS";

function repoFor(cfg) {
  const custom = cfg && cfg.repo && cfg.repo.trim();
  if (custom) return custom.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  return process.env.FIG_GH_REPO || DEFAULT_REPO;
}

function tokenFor(cfg) {
  return process.env.FIG_GH_TOKEN || (cfg && cfg.token ? String(cfg.token).trim() : "");
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