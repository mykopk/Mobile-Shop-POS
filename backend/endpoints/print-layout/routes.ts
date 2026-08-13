import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  importHandler,
  listHandler,
  setDefaultHandler,
  updateHandler,
} from "./handlers";
import { printLayoutImportSchema, printLayoutSchema, printLayoutUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.printView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.printCreate), validate(printLayoutSchema), asyncHandler(createHandler));
router.post("/import", requirePermission(PERMISSIONS.printCreate), validate(printLayoutImportSchema), asyncHandler(importHandler));
router.put("/:id", requirePermission(PERMISSIONS.printUpdate), validate(printLayoutUpdateSchema), asyncHandler(updateHandler));
router.post("/:id/default", requirePermission(PERMISSIONS.printSetDefault), asyncHandler(setDefaultHandler));
router.delete("/:id", requirePermission(PERMISSIONS.printDelete), asyncHandler(deleteHandler));

export default router;
