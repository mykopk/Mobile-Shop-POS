"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OtpInput } from "@/components/auth/otp-input";
import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { AUTH, APP, PIN_LENGTH } from "@/lib/constants";

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "ready" && user) {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  async function submit(nextPin: string) {
    if (!username.trim()) {
      toast(AUTH.userRequired, "error");
      setPin("");
      return;
    }
    if (nextPin.length < PIN_LENGTH) return;
    setSubmitting(true);
    try {
      const authUser = await login(username, nextPin);
      toast(`${AUTH.loginSuccess}, ${authUser.name}!`, "success");
      router.replace("/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : AUTH.invalidPin, "error");
      setPin("");
      setSubmitting(false);
    }
  }

  function handleOtpChange(next: string) {
    setPin(next);
    if (next.length === PIN_LENGTH) {
      submit(next);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-brand-50 via-ink-50 to-ink-50">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-100 blur-3xl"
        aria-hidden
      />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-md">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-[0_24px_60px_-24px_rgba(230,59,32,0.4)]">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-ink-400">
              {AUTH.title}
            </h2>

            <div className="mt-6 space-y-6">
            <div>
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                {AUTH.username}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={AUTH.usernamePlaceholder}
                autoComplete="username"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-2.5 block text-center text-xs font-semibold uppercase tracking-wider text-ink-500">
                {AUTH.enterPin}
              </label>
              <OtpInput
                length={PIN_LENGTH}
                value={pin}
                onChange={handleOtpChange}
                disabled={submitting}
              />
            </div>

            <p className="text-center text-xs text-ink-400">{AUTH.demoHint}</p>
          </div>
        </div>
      </div>
      </div>

      <footer className="relative z-10 flex flex-col items-center gap-2 px-4 pb-8">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <p className="text-sm font-bold tracking-tight text-ink-900">
            {APP.name}
            <span className="text-brand-600">{APP.nameSuffix}</span>
          </p>
        </div>
        <p className="text-xs text-ink-400">{APP.tagline}</p>
        <p className="text-[10px] text-ink-400/60">
          © {new Date().getFullYear()} {APP.name} {APP.nameSuffix}. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}
