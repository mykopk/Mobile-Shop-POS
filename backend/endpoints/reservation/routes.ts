import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import { cancelHandler, checkHandler, createHandler, listHandler, refundHandler, returnHandler } from "./handlers";
import { cancelReservationSchema, createReservationSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listHandler));
router.get("/check", asyncHandler(checkHandler));
router.post("/", validate(createReservationSchema), asyncHandler(createHandler));
router.post("/:id/cancel", validate(cancelReservationSchema), asyncHandler(cancelHandler));
router.post("/:id/return", asyncHandler(returnHandler));
router.post("/:id/refund", asyncHandler(refundHandler));

export default router;
