import type { Request, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "./error";

export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      next(new ApiError(400, "validation_error", first?.message ?? "Invalid input"));
      return;
    }
    req.body = result.data;
    next();
  };
}
