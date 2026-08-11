import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  createPurchaseHandler,
  createSaleHandler,
  getHandler,
  listHandler,
  purchaseReturnHandler,
  saleReturnHandler,
  voidReturnHandler,
} from "./handlers";
import {
  createPurchaseSchema,
  createSaleSchema,
  purchaseReturnSchema,
  saleReturnSchema,
} from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.get("/:id", asyncHandler(getHandler));
router.post("/sale", validate(createSaleSchema), asyncHandler(createSaleHandler));
router.post("/sale/returns", validate(saleReturnSchema), asyncHandler(saleReturnHandler));
router.post("/purchase", validate(createPurchaseSchema), asyncHandler(createPurchaseHandler));
router.post("/purchase/returns", validate(purchaseReturnSchema), asyncHandler(purchaseReturnHandler));
router.post("/returns/:id/void", asyncHandler(voidReturnHandler));

export default router;
