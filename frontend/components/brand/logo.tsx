"use client";

import { BRAND } from "@/lib/constants";
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill={`url(#${BRAND.gradient.id})`} />
      <rect
        x="18"
        y="12"
        width="28"
        height="40"
        rx="5"
        stroke="white"
        strokeWidth="3.5"
      />
      <rect x="25" y="18" width="14" height="4" rx="2" fill="white" opacity="0.6" />
      <circle cx="32" cy="44" r="2.5" fill="white" />
      <path
        d="M22 30c4 6 16 6 20 0"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <defs>
        <linearGradient id={BRAND.gradient.id} x1="0" y1="0" x2="64" y2="64">
          <stop stopColor={BRAND.gradient.from} />
          <stop offset="1" stopColor={BRAND.gradient.to} />
        </linearGradient>
      </defs>
    </svg>
  );
}
