import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  listHandler,
  setDefaultHandler,
  updateHandler,
} from "./handlers";
import { printLayoutSchema, printLayoutUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.post("/", validate(printLayoutSchema), asyncHandler(createHandler));
router.put("/:id", validate(printLayoutUpdateSchema), asyncHandler(updateHandler));
router.post("/:id/default", asyncHandler(setDefaultHandler));
router.delete("/:id", asyncHandler(deleteHandler));

export default router;
