import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { activityHandler, overviewHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/overview", requirePermission(PERMISSIONS.dashboardView), asyncHandler(overviewHandler));
router.get("/activity", requirePermission(PERMISSIONS.dashboardView), asyncHandler(activityHandler));

export default router;
