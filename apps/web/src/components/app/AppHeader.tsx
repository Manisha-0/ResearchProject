"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { RoleSwitcher } from "@/components/app/RoleSwitcher";
import { useCompassStore } from "@/store/compass-store";

type Role = "patient" | "caregiver" | "navigator";

type AppHeaderProps = {
  currentRole: Role;
  showReset?: boolean;
};

export function AppHeader({ currentRole, showReset = false }: AppHeaderProps) {
  const resetDemo = useCompassStore((state) => state.resetDemo);

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

        <RoleSwitcher currentRole={currentRole} />

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-gold-tint px-3 py-1.5 text-xs font-semibold text-navy-deep lg:block">
            Demo · Synthetic
          </span>

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
        </div>
      </div>
    </header>
  );
}
