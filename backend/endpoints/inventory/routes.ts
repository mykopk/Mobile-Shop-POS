import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { inventoryHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(inventoryHandler));

export default router;
