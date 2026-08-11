import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
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

router.get("/", asyncHandler(listHandler));
router.get("/dedupe", asyncHandler(dedupeHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/import", validate(importContactsSchema), asyncHandler(importHandler));
router.post("/", validate(contactSchema), asyncHandler(createHandler));
router.put("/:id", validate(contactSchema), asyncHandler(updateHandler));
router.delete("/", asyncHandler(bulkDeleteHandler));

export default router;
