import bcrypt from "bcryptjs";
import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { env } from "../../core/config/env";
import { ROLE_PERMISSIONS, storedPermissions } from "../../core/lib/permissions";
import type { Role } from "../../generated/prisma/enums";
import type { CreateUserInput, UpdateUserInput } from "./schemas";

const select = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  active: true,
  permissions: true,
  createdAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({ select, orderBy: { createdAt: "asc" } });
}

export async function createUser(input: CreateUserInput, actorId: string) {
  const username = input.username.toLowerCase();
  const email = input.email ? input.email.toLowerCase() : `${username}@local`;
  const permissions =
    input.permissions !== undefined
      ? storedPermissions(input.permissions)
      : [...ROLE_PERMISSIONS[input.role]];

  const user = await prisma.user.create({
    data: {
      username,
      name: input.name,
      email,
      pinHash: await bcrypt.hash(input.pin, env.BCRYPT_ROUNDS),
      role: input.role as Role,
      active: input.active ?? true,
      permissions,
    },
    select,
  });
  await writeAudit({
    userId: actorId,
    action: "USER.CREATE",
    entity: "User",
    entityId: user.id,
    details: JSON.stringify({ username, role: user.role }),
  });
  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "user.not_found", "User not found");

  const data: Record<string, unknown> = {};
  if (input.username !== undefined) data.username = input.username.toLowerCase();
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email.toLowerCase();
  if (input.pin !== undefined) data.pinHash = await bcrypt.hash(input.pin, env.BCRYPT_ROUNDS);
  if (input.role !== undefined) data.role = input.role as Role;
  if (input.active !== undefined) data.active = input.active;
  if (input.permissions !== undefined) data.permissions = storedPermissions(input.permissions);

  if (id === actorId && data.active === false) {
    throw new ApiError(400, "user.cannot_deactivate_self", "You cannot deactivate your own account");
  }
  if (id === actorId && data.permissions !== undefined) {
    const next = data.permissions as string[];
    if (!next.includes("user.manage")) {
      throw new ApiError(400, "user.cannot_remove_own_access", "You cannot remove your own user.manage");
    }
  }

  const user = await prisma.user.update({ where: { id }, data, select });
  await writeAudit({
    userId: actorId,
    action: "USER.UPDATE",
    entity: "User",
    entityId: id,
    details: JSON.stringify({ username: user.username, role: user.role, active: user.active }),
  });
  return user;
}

export async function deleteUser(id: string, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "user.not_found", "User not found");
  if (id === actorId) {
    throw new ApiError(400, "user.cannot_delete_self", "You cannot delete your own account");
  }

  await prisma.$transaction([
    prisma.printLayout.deleteMany({ where: { userId: id } }),
    prisma.dashboardWidget.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  await writeAudit({
    userId: actorId,
    action: "USER.DELETE",
    entity: "User",
    entityId: id,
    details: JSON.stringify({ username: existing.username, role: existing.role }),
  });
  return { id, username: existing.username };
}
