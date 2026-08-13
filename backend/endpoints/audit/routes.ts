import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { listHandler, metaHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.auditView), asyncHandler(listHandler));
router.get("/meta", requirePermission(PERMISSIONS.auditView), asyncHandler(metaHandler));

export default router;
