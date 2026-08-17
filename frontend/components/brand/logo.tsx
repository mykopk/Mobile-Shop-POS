"use client";

import { useApi } from "@/lib/use-api";
import type { CompanyProfile } from "@/lib/api-types";

export function Logo({ size = 56, src }: { size?: number; src?: string | null }) {
  const { data } = useApi<CompanyProfile>(src ? null : "/settings/company");
  const logoUrl = src ?? data?.logoUrl ?? null;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src="/icon.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-xl object-contain"
      style={{ width: size, height: size }}
    />
  );
}
