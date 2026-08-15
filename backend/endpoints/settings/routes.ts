import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import {
  companyGetHandler,
  companyPutHandler,
  printDefaultsGetHandler,
  printDefaultsPutHandler,
  soundGetHandler,
  soundPutHandler,
} from "./handlers";
import { companyProfileSchema, printDefaultsSchema, soundPrefsSchema } from "./schemas";

const router = Router();

router.get("/company", asyncHandler(companyGetHandler));

router.use(requireAuth);

router.put("/company", requirePermission(PERMISSIONS.settingsWrite), validate(companyProfileSchema), asyncHandler(companyPutHandler));
router.get("/sound", requirePermission(PERMISSIONS.settingsView), asyncHandler(soundGetHandler));
router.put("/sound", requirePermission(PERMISSIONS.settingsView), validate(soundPrefsSchema), asyncHandler(soundPutHandler));
router.get("/print-defaults", requirePermission(PERMISSIONS.settingsView), asyncHandler(printDefaultsGetHandler));
router.put("/print-defaults", requirePermission(PERMISSIONS.settingsWrite), validate(printDefaultsSchema), asyncHandler(printDefaultsPutHandler));

export default router;
