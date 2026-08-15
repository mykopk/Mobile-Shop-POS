import { readQueue, removeQueuedRequest } from "./offline-queue";

const BASE = process.env.NEXT_PUBLIC_API_URL;

async function replayOne(record: { path: string; method: string; body?: unknown }) {
  const res = await fetch(`${BASE}${record.path}`, {
    method: record.method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: record.body === undefined ? undefined : JSON.stringify(record.body),
  });
  return res.ok;
}

export async function flushOfflineQueue() {
  const queue = readQueue();
  let synced = 0;
  for (const record of queue) {
    try {
      const ok = await replayOne(record);
      if (ok) {
        removeQueuedRequest(record.id);
        synced += 1;
      }
    } catch {
      break; // still offline — stop and wait for next reconnect
    }
  }
  return synced;
}
