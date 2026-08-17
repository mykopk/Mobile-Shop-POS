"use client";

import { useEffect } from "react";
import { UI } from "@/lib/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(reset, 2500);
    return () => clearTimeout(timer);
  }, [reset]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-50 font-sans text-ink-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-semibold">{UI.error}</h1>
          <p className="text-sm text-ink-500">Something went wrong while loading this page.</p>
          <button
            onClick={reset}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {UI.retry}
          </button>
        </div>
      </body>
    </html>
  );
}