import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { loginHandler } from "./handlers";
import { loginSchema } from "./schemas";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(loginHandler));

export default router;
