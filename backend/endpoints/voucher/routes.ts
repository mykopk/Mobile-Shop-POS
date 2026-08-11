import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  createHandler,
  getHandler,
  listHandler,
  reverseHandler,
  updateHandler,
} from "./handlers";
import { reverseVoucherSchema, voucherSchema, voucherUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/", validate(voucherSchema), asyncHandler(createHandler));
router.put("/:id", validate(voucherUpdateSchema), asyncHandler(updateHandler));
router.post("/:id/reverse", validate(reverseVoucherSchema), asyncHandler(reverseHandler));

export default router;
