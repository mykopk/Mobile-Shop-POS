import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { getAuthToken } from "../lib/cookie";
import { verifyToken } from "../lib/jwt";
import { effectivePermissions, type Permission } from "../lib/permissions";
import { ApiError } from "./error";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string; role: Role; permissions: Permission[] };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  if (!token) {
    next(new ApiError(401, "auth.unauthorized", "Not authorized"));
    return;
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    next(new ApiError(401, "auth.invalid_token", "Invalid or expired token"));
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, active: true, permissions: true },
    });
    if (!user || !user.active) {
      next(new ApiError(401, "auth.unauthorized", "Not authorized"));
      return;
    }
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: effectivePermissions(user),
    };
    next();
  } catch (e) {
    next(e);
  }
}

export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, "auth.unauthorized", "Not authorized"));
      return;
    }
    if (!permissions.some((p) => req.user!.permissions.includes(p))) {
      next(new ApiError(403, "auth.forbidden", "Forbidden"));
      return;
    }
    next();
  };
}
