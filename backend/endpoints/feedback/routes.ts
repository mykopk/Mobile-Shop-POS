import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { rateLimit } from "../../core/lib/rateLimit";
import { validate } from "../../core/middleware/validate";
import { crashReportHandler, feedbackStatusHandler } from "./handlers";
import { crashReportSchema } from "./schemas";

const router = Router();

router.get("/status", asyncHandler(feedbackStatusHandler));

router.post(
  "/crash",
  rateLimit({
    windowMs: 60_000,
    max: 20,
    key: () => "feedback-crash",
  }),
  validate(crashReportSchema),
  asyncHandler(crashReportHandler),
);

export default router;