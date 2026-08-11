import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  bulkDeleteHandler,
  createHandler,
  getHandler,
  importHandler,
  listHandler,
  searchHandler,
  updateHandler,
} from "./handlers";
import { importProductsSchema, productSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.get("/search", asyncHandler(searchHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/import", validate(importProductsSchema), asyncHandler(importHandler));
router.post("/", validate(productSchema), asyncHandler(createHandler));
router.put("/:id", validate(productSchema), asyncHandler(updateHandler));
router.delete("/", asyncHandler(bulkDeleteHandler));

export default router;
