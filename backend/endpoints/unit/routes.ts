import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  adjustHandler,
  bulkDeleteHandler,
  createHandler,
  getHandler,
  imeiHandler,
  importHandler,
  listHandler,
  movementsHandler,
  returnEligibleHandler,
  saleReturnEligibleHandler,
  updateHandler,
} from "./handlers";
import { adjustSchema, importUnitsSchema, unitSchema, unitUpdateSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.get("/movements", asyncHandler(movementsHandler));
router.get("/return-eligible", asyncHandler(returnEligibleHandler));
router.get("/sale-return-eligible", asyncHandler(saleReturnEligibleHandler));
router.get("/imei/:imei", asyncHandler(imeiHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/import", validate(importUnitsSchema), asyncHandler(importHandler));
router.post("/adjust", validate(adjustSchema), asyncHandler(adjustHandler));
router.post("/", validate(unitSchema), asyncHandler(createHandler));
router.put("/:id", validate(unitUpdateSchema), asyncHandler(updateHandler));
router.delete("/", asyncHandler(bulkDeleteHandler));

export default router;
