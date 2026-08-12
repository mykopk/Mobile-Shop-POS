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
import { brandSchema, brandUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.brandView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.brandCreate), validate(brandSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.brandUpdate), validate(brandUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", requirePermission(PERMISSIONS.brandDelete), asyncHandler(deleteHandler));
router.post("/:id/deactivate", requirePermission(PERMISSIONS.brandUpdate), asyncHandler(deactivateHandler));

export default router;
