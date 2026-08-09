"use client";

import { ROLE_META } from "@/lib/constants/users";
import type { Role } from "@/lib/constants/users";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  role,
  size = 40,
}: {
  name: string;
  role: Role;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundColor: ROLE_META[role].color,
      }}
    >
      {initials(name)}
    </span>
  );
}
