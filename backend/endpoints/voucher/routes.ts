import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  getHandler,
  listHandler,
  restoreHandler,
  reverseHandler,
  updateHandler,
} from "./handlers";
import { reverseVoucherSchema, voucherSchema, voucherUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.voucherView), asyncHandler(listHandler));
router.get("/:id", requirePermission(PERMISSIONS.voucherView), asyncHandler(getHandler));
router.post("/", requirePermission(PERMISSIONS.voucherCreate), validate(voucherSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.voucherUpdate), validate(voucherUpdateSchema), asyncHandler(updateHandler));
router.post("/:id/reverse", requirePermission(PERMISSIONS.voucherReverse), validate(reverseVoucherSchema), asyncHandler(reverseHandler));
router.post("/:id/restore", requirePermission(PERMISSIONS.voucherReverse), asyncHandler(restoreHandler));

export default router;
