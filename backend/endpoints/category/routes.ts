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
import { categorySchema, categoryUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.categoryView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.categoryCreate), validate(categorySchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.categoryUpdate), validate(categoryUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", requirePermission(PERMISSIONS.categoryDelete), asyncHandler(deleteHandler));
router.post("/:id/deactivate", requirePermission(PERMISSIONS.categoryUpdate), asyncHandler(deactivateHandler));

export default router;
