import bcrypt from "bcryptjs";
import type { Role } from "../../generated/prisma/enums";
import { signToken } from "../../core/lib/jwt";
import { prisma } from "../../core/lib/prisma";
import { effectivePermissions } from "../../core/lib/permissions";
import { ApiError } from "../../core/middleware/error";
import type { LoginInput } from "./schemas";

type UserRecord = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
};

function toUserPayload(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: effectivePermissions(user),
  };
}

export async function loginUser({ username, pin }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  const pinValid =
    user && user.active ? await bcrypt.compare(pin, user.pinHash) : false;

  if (!user || !user.active || !pinValid) {
    throw new ApiError(
      401,
      "auth.invalid_credentials",
      "Invalid username or PIN.",
    );
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    token,
    user: toUserPayload(user as UserRecord),
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.active) {
    throw new ApiError(401, "auth.unauthorized", "Not authorized");
  }
  return toUserPayload(user as UserRecord);
}
