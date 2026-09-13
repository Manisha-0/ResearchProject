"use client";

import Link from "next/link";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  RotateCcw,
} from "lucide-react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  getHomeRouteForRole,
} from "@/lib/auth-routing";

import {
  useAuthStore,
} from "@/store/auth-store";

import {
  useCompassStore,
} from "@/store/compass-store";

type AppHeaderProps = {
  showReset?: boolean;
};

export function AppHeader({
  showReset = false,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore(
    (state) => state.user,
  );

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const resetDemo =
    useCompassStore(
      (state) =>
        state.resetDemo,
    );

  const homeHref = user
    ? getHomeRouteForRole(
        user.role,
      )
    : "/";

  function handleSignOut() {
    logout();

    router.replace(
      "/login",
    );
  }

  function formatRole(
    role: string,
  ) {
    return role
      .split("_")
      .map(
        (part) =>
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(1),
      )
      .join(" ");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-8">
        <Link
          href={homeHref}
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
              Cancer care
              navigation
            </p>
          </div>
        </Link>

        {user?.role ===
          "navigator" && (
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            <HeaderNavLink
              href="/navigator"
              active={
                pathname ===
                  "/navigator" ||
                pathname.startsWith(
                  "/navigator/patient/",
                )
              }
              icon={
                <LayoutDashboard />
              }
            >
              Dashboard
            </HeaderNavLink>

            <HeaderNavLink
              href="/navigator/tasks"
              active={
                pathname ===
                  "/navigator/tasks" ||
                pathname.startsWith(
                  "/navigator/tasks/",
                )
              }
              icon={
                <ClipboardList />
              }
            >
              Work Queue
            </HeaderNavLink>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="max-w-55 truncate text-sm font-semibold text-ink">
                {user.email}
              </p>

              <p className="text-xs text-ink-soft">
                {formatRole(
                  user.role,
                )}
              </p>
            </div>
          )}

          {showReset && (
            <button
              type="button"
              onClick={
                resetDemo
              }
              title="Reset demo data"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:border-navy/30 hover:text-navy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={
                handleSignOut
              }
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

      {user?.role ===
        "navigator" && (
        <div className="border-t border-border/70 md:hidden">
          <nav className="mx-auto flex max-w-6xl gap-1 px-4 py-2 sm:px-8">
            <HeaderNavLink
              href="/navigator"
              active={
                pathname ===
                  "/navigator" ||
                pathname.startsWith(
                  "/navigator/patient/",
                )
              }
              icon={
                <LayoutDashboard />
              }
            >
              Dashboard
            </HeaderNavLink>

            <HeaderNavLink
              href="/navigator/tasks"
              active={
                pathname ===
                  "/navigator/tasks" ||
                pathname.startsWith(
                  "/navigator/tasks/",
                )
              }
              icon={
                <ClipboardList />
              }
            >
              Work Queue
            </HeaderNavLink>
          </nav>
        </div>
      )}
    </header>
  );
}

function HeaderNavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-lg bg-navy-tint px-3 py-2 text-sm font-semibold text-navy"
          : "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-soft hover:text-navy"
      }
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>

      {children}
    </Link>
  );
}