import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { activityHandler, overviewHandler } from "./handlers";

const router = Router();

router.use(requireAuth);

router.get("/overview", asyncHandler(overviewHandler));
router.get("/activity", asyncHandler(activityHandler));

export default router;
