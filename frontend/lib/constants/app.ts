export const APP = {
  name: "Fig POS",
  nameFull: "Fig POS for Mobile Phones",
  tagline: "The complete point of sale built for new and used mobile phone shops",
  footer: "New & used · IMEI tracked · Credit & analytics",
  storeSub: "Mobile Phone Shop",
  signInTitle: "Sign in to your store",
  // Build-verification marker shown only on dev builds (never in production).
  devMarker: process.env.NODE_ENV !== "production" ? "DEV-20260817" : "",
} as const;

export const DEFAULT_LOCALE = "en-PK";

export const DEFAULT_TIMEZONE = "Asia/Karachi";

// Same-origin /api proxy (the Next server forwards it to the backend). Falls
// back to /api so the app works even when NEXT_PUBLIC_API_URL isn't set at
// build time (CI/packaged builds don't ship the gitignored .env.local).
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
