"use client";

import Link from "next/link";
import { LogOut, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCompassStore } from "@/store/compass-store";

type AppHeaderProps = {
  showReset?: boolean;
};

export function AppHeader({ showReset = false }: AppHeaderProps) {
  const router = useRouter();

  const session = useCompassStore((state) => state.session);

  const signOut = useCompassStore((state) => state.signOut);

  const resetDemo = useCompassStore((state) => state.resetDemo);

  function handleSignOut() {
    signOut();

    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy font-bold text-white">
            C
          </div>

          <div className="hidden sm:block">
            <p className="font-semibold text-navy">Compass</p>

            <p className="text-xs text-ink-soft">Cancer care navigation</p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full bg-gold-tint px-3 py-1.5 text-xs font-semibold text-navy-deep lg:inline-flex">
            Demo · Synthetic
          </span>

          {session && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{session.name}</p>

              <p className="text-xs capitalize text-ink-soft">{session.role}</p>
            </div>
          )}

          {showReset && (
            <button
              type="button"
              onClick={resetDemo}
              title="Reset demo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:border-navy/30 hover:text-navy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {session && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-navy/30 hover:text-navy"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
