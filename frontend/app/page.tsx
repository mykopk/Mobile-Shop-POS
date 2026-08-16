"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSetupStatus } from "@/lib/use-setup";
import { UI } from "@/lib/constants";

export default function HomePage() {
  const { user, status } = useAuth();
  const { needsSetup, loading } = useSetupStatus();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready" || loading) return;
    if (user) {
      router.replace("/dashboard");
    } else if (needsSetup) {
      router.replace("/onboarding");
    } else {
      router.replace("/login");
    }
  }, [status, user, needsSetup, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 text-ink-500">
      {UI.loading}
    </div>
  );
}
