import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  deactivateHandler,
  listHandler,
  updateHandler,
} from "./handlers";
import { colorSchema, colorUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.colorView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.colorCreate), validate(colorSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.colorUpdate), validate(colorUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", requirePermission(PERMISSIONS.colorDelete), asyncHandler(deleteHandler));
router.post("/:id/deactivate", requirePermission(PERMISSIONS.colorUpdate), asyncHandler(deactivateHandler));

export default router;
