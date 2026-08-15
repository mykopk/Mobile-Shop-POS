import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import { createHandler, deleteHandler, listHandler, updateHandler } from "./handlers";
import { citySchema } from "./schemas";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(PERMISSIONS.cityView), asyncHandler(listHandler));
router.post("/", requirePermission(PERMISSIONS.cityCreate), validate(citySchema), asyncHandler(createHandler));
router.put("/:id", requirePermission(PERMISSIONS.cityUpdate), validate(citySchema), asyncHandler(updateHandler));
router.delete("/:id", requirePermission(PERMISSIONS.cityDelete), asyncHandler(deleteHandler));

export default router;
