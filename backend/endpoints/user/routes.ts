import { Router } from "express";
import { asyncHandler } from "../../core/lib/asyncHandler";
import { requireAuth, requirePermission } from "../../core/middleware/auth";
import { PERMISSIONS } from "../../core/lib/permissions";
import { validate } from "../../core/middleware/validate";
import { createHandler, listHandler, updateHandler } from "./handlers";
import { createUserSchema, updateUserSchema } from "./schemas";

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.userManage));

router.get("/", asyncHandler(listHandler));
router.post("/", validate(createUserSchema), asyncHandler(createHandler));
router.put("/:id", validate(updateUserSchema), asyncHandler(updateHandler));

export default router;
