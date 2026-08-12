import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  bulkDeleteHandler,
  createHandler,
  dedupeHandler,
  getHandler,
  importHandler,
  listHandler,
  updateHandler,
} from "./handlers";
import { contactSchema, importContactsSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.contactView), asyncHandler(listHandler));
router.get("/dedupe", requirePermission(PERMISSIONS.contactView), asyncHandler(dedupeHandler));
router.get("/:id", requirePermission(PERMISSIONS.contactView), asyncHandler(getHandler));
router.post("/import", requirePermission(PERMISSIONS.contactImport), validate(importContactsSchema), asyncHandler(importHandler));
router.post("/", requirePermission(PERMISSIONS.contactCreate), validate(contactSchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.contactUpdate), validate(contactSchema), asyncHandler(updateHandler));
router.delete("/", requirePermission(PERMISSIONS.contactDelete), asyncHandler(bulkDeleteHandler));

export default router;
