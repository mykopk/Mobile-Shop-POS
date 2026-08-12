import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  listHandler,
  setDefaultHandler,
  updateHandler,
} from "./handlers";
import { bankAccountSchema, bankAccountUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.bankView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.bankCreate), validate(bankAccountSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.bankUpdate), validate(bankAccountUpdateSchema), asyncHandler(updateHandler));
router.post("/:id/default", requirePermission(PERMISSIONS.bankSetDefault), asyncHandler(setDefaultHandler));
router.delete("/:id", requirePermission(PERMISSIONS.bankDelete), asyncHandler(deleteHandler));

export default router;
