import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import { collectHandler } from "./handlers";
import { collectSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.post("/collect", requirePermission(PERMISSIONS.paymentCollect), validate(collectSchema), asyncHandler(collectHandler));

export default router;
