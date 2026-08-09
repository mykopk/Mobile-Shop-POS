"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { UI } from "@/lib/constants";

export default function HomePage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready") return;
    router.replace(user ? "/dashboard" : "/login");
  }, [status, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 text-ink-500">
      {UI.loading}
    </div>
  );
}
