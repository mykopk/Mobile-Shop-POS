import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
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

router.get("/", asyncHandler(listHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/", validate(expenseSchema), asyncHandler(createHandler));
router.put("/:id", validate(expenseUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", asyncHandler(deleteHandler));

export default router;
