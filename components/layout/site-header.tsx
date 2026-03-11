import Link from "next/link";

import { PrimaryNav } from "@/components/navigation/primary-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          Nahuel Piersanti
        </Link>
        <PrimaryNav />
      </div>
    </header>
  );
}
