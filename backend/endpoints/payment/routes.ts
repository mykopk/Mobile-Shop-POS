import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import { collectHandler } from "./handlers";
import { collectSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.post("/collect", validate(collectSchema), asyncHandler(collectHandler));

export default router;
