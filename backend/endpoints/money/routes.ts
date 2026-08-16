import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import { adjustHandler, movementsHandler, overviewHandler, settleCardHandler, transferHandler } from "./handlers";
import { adjustSchema, settleCardSchema, transferSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.moneyView), asyncHandler(overviewHandler));
router.get("/movements", requirePermission(PERMISSIONS.moneyView), asyncHandler(movementsHandler));
router.post("/settle-card", requirePermission(PERMISSIONS.moneyWrite), validate(settleCardSchema), asyncHandler(settleCardHandler));
router.post("/transfer", requirePermission(PERMISSIONS.moneyWrite), validate(transferSchema), asyncHandler(transferHandler));
router.post("/adjust", requirePermission(PERMISSIONS.moneyWrite), validate(adjustSchema), asyncHandler(adjustHandler));

export default router;
