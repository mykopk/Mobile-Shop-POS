import express, { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { exportHandler, restoreHandler, configGetHandler, configSaveHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.backup), asyncHandler(exportHandler));
router.get("/config", requirePermission(PERMISSIONS.backup), asyncHandler(configGetHandler));
router.put("/config", requirePermission(PERMISSIONS.backup), asyncHandler(configSaveHandler));
router.post(
  "/restore",
  requirePermission(PERMISSIONS.backup),
  express.raw({ type: ["application/octet-stream", "application/x-sqlite3"], limit: "300mb" }),
  asyncHandler(restoreHandler),
);

export default router;
