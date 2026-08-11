import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import {
  companyGetHandler,
  companyPutHandler,
  soundGetHandler,
  soundPutHandler,
} from "./handlers";
import { companyProfileSchema, soundPrefsSchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/company", asyncHandler(companyGetHandler));
router.put("/company", validate(companyProfileSchema), asyncHandler(companyPutHandler));
router.get("/sound", asyncHandler(soundGetHandler));
router.put("/sound", validate(soundPrefsSchema), asyncHandler(soundPutHandler));

export default router;
