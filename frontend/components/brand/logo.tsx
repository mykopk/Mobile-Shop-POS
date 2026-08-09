import { BRAND } from "@/lib/constants";

export function Logo({ size = 56 }: { size?: number }) {
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
