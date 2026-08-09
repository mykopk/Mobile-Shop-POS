"use client";

import { UI } from "@/lib/constants";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center">
      <h1 className="text-lg font-semibold text-ink-900">{UI.error}</h1>
      <p className="text-sm text-ink-500">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {UI.retry}
      </button>
    </div>
  );
}
