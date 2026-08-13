import type { Request, RequestHandler, Response } from "express";
import { ApiError } from "../middleware/error";

type Entry = { count: number; resetAt: number };

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
}): RequestHandler {
  const { windowMs, max, key } = opts;
  const hits = new Map<string, Entry>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(k);
    }
  }, windowMs);
  sweep.unref?.();

  return (req: Request, _res: Response, next) => {
    const k = key(req);
    const now = Date.now();
    const entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfterMs = entry.resetAt - now;
      const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      next(
        new ApiError(
          429,
          "auth.rate_limited",
          `Too many attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
          { retryAfterMs, retryAfterSeconds: seconds },
        ),
      );
      return;
    }
    next();
  };
}
