import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  closeHandler,
  currentHandler,
  listHandler,
  openHandler,
} from "./handlers";
import { closeCashSessionSchema, openCashSessionSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.cashSessionView), asyncHandler(listHandler));
router.get("/current", requirePermission(PERMISSIONS.cashSessionView), asyncHandler(currentHandler));
router.post("/open", requirePermission(PERMISSIONS.cashSessionOpen), validate(openCashSessionSchema), asyncHandler(openHandler));
router.post("/:id/close", requirePermission(PERMISSIONS.cashSessionClose), validate(closeCashSessionSchema), asyncHandler(closeHandler));

export default router;
