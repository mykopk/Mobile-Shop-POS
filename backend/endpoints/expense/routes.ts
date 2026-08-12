import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  getHandler,
  listHandler,
  updateHandler,
} from "./handlers";
import { expenseSchema, expenseUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.expenseView), asyncHandler(listHandler));
router.get("/:id", requirePermission(PERMISSIONS.expenseView), asyncHandler(getHandler));
router.post("/", requirePermission(PERMISSIONS.expenseCreate), validate(expenseSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.expenseUpdate), validate(expenseUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", requirePermission(PERMISSIONS.expenseDelete), asyncHandler(deleteHandler));

export default router;
