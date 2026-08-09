import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "../../generated/prisma/enums";
import { verifyToken } from "../lib/jwt";
import { ApiError } from "./error";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "auth.unauthorized", "Not authorized"));
    return;
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch {
    next(new ApiError(401, "auth.invalid_token", "Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ApiError(403, "auth.forbidden", "Forbidden"));
      return;
    }
    next();
  };
}
