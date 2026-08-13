import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { rateLimit } from "../../core/lib/rateLimit";
import { env } from "../../core/config/env";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import { changePinHandler, loginHandler, logoutHandler, meHandler } from "./handlers";
import { changePinSchema, loginSchema } from "./schemas";

const router = Router();

router.post(
  "/login",
  validate(loginSchema),
  rateLimit({
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
    max: env.LOGIN_RATE_LIMIT_MAX,
    key: (req) => `${req.ip ?? "unknown"}|${String(req.body?.username ?? "").toUpperCase()}`,
  }),
  asyncHandler(loginHandler),
);

router.get("/me", requireAuth, asyncHandler(meHandler));

router.post("/logout", asyncHandler(logoutHandler));

router.put("/pin", requireAuth, validate(changePinSchema), asyncHandler(changePinHandler));

export default router;
