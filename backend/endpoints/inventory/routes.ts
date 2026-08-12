import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { inventoryHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.inventoryView), asyncHandler(inventoryHandler));

export default router;
