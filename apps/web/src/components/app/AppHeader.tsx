"use client";

import Link from "next/link";
import { LogOut, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";
import { useCompassStore } from "@/store/compass-store";

type AppHeaderProps = {
  showReset?: boolean;
};

export function AppHeader({
  showReset = false,
}: AppHeaderProps) {
  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user
  );

  const logout = useAuthStore(
    (state) => state.logout
  );

  const resetDemo = useCompassStore(
    (state) => state.resetDemo
  );

  function handleSignOut() {
    logout();

    router.replace("/login");
  }

  function formatRole(
    role: string
  ) {
    return role
      .split("_")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy font-bold text-white">
            C
          </div>

          <div className="hidden sm:block">
            <p className="font-semibold text-navy">
              Compass
            </p>

            <p className="text-xs text-ink-soft">
              Cancer care navigation
            </p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="max-w-55 truncate text-sm font-semibold text-ink">
                {user.email}
              </p>

              <p className="text-xs text-ink-soft">
                {formatRole(user.role)}
              </p>
            </div>
          )}

          {showReset && (
            <button
              type="button"
              onClick={resetDemo}
              title="Reset demo data"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:border-navy/30 hover:text-navy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-navy/30 hover:text-navy"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">
                Sign out
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}