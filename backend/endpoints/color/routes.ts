import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  deleteHandler,
  deactivateHandler,
  listHandler,
  updateHandler,
} from "./handlers";
import { colorSchema, colorUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.post("/", validate(colorSchema), asyncHandler(createHandler));
router.put("/:id", validate(colorUpdateSchema), asyncHandler(updateHandler));
router.delete("/:id", asyncHandler(deleteHandler));
router.post("/:id/deactivate", asyncHandler(deactivateHandler));

export default router;
