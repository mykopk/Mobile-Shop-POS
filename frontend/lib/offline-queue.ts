const QUEUE_KEY = "fig.offline.queue";

type QueuedRequest = {
  id: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  queuedAt: number;
};

export type OfflineQueue = QueuedRequest[];

export function readQueue(): OfflineQueue {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueue) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function enqueueQueuedRequest(req: Omit<QueuedRequest, "id" | "queuedAt">) {
  const queue = readQueue();
  const record: QueuedRequest = { ...req, id: crypto.randomUUID(), queuedAt: Date.now() };
  writeQueue([...queue, record]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fig:offline-queue-updated"));
  }
  return record;
}

export function removeQueuedRequest(id: string) {
  writeQueue(readQueue().filter((r) => r.id !== id));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fig:offline-queue-updated"));
  }
}

export function queueCount() {
  return readQueue().length;
}
