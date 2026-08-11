import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import {
  balancesHandler,
  expensesHandler,
  ledgerHandler,
  paymentsHandler,
  profitHandler,
  purchasesHandler,
  salesHandler,
  stockHandler,
  summaryHandler,
} from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/summary", asyncHandler(summaryHandler));
router.get("/sales", asyncHandler(salesHandler));
router.get("/purchases", asyncHandler(purchasesHandler));
router.get("/profit", asyncHandler(profitHandler));
router.get("/expenses", asyncHandler(expensesHandler));
router.get("/stock", asyncHandler(stockHandler));
router.get("/payments", asyncHandler(paymentsHandler));
router.get("/balances", asyncHandler(balancesHandler));
router.get("/ledger/:contactId", asyncHandler(ledgerHandler));

export default router;
