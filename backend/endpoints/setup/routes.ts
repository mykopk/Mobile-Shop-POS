import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { statusHandler, setupHandler } from "./handlers";
import { setupSchema } from "./schemas";

const router = Router();

router.get("/status", asyncHandler(statusHandler));
router.post("/", validate(setupSchema), asyncHandler(setupHandler));

export default router;