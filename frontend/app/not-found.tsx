import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP, UI } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center">
      <Logo size={44} />
      <h1 className="text-lg font-semibold text-ink-900">{UI.pageNotFound}</h1>
      <p className="text-sm text-ink-500">{UI.pageNotFoundHint}</p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {UI.backToDashboard}
      </Link>
      <p className="text-xs text-ink-400">
        {APP.name}
        {APP.nameSuffix}
      </p>
    </main>
  );
}
