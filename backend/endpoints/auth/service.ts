import bcrypt from "bcryptjs";
import { signToken } from "../../core/lib/jwt";
import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import type { LoginInput } from "./schemas";

export async function loginUser({ username, pin }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!user || !user.active) {
    throw new ApiError(
      401,
      "auth.user_not_found",
      "No user found with that username.",
    );
  }

  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    throw new ApiError(401, "auth.invalid_pin", "Invalid PIN. Try again.");
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
