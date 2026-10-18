"use client";

import Link from "next/link";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PhoneCall,
  RotateCcw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { CompassMark } from "@/components/app/CompassMark";
import { getHomeRouteForRole } from "@/lib/auth-routing";
import { useAuthStore } from "@/store/auth-store";
import { useCompassStore } from "@/store/compass-store";

type AppHeaderProps = {
  showReset?: boolean;
};

const NAVIGATOR_LINKS = [
  {
    href: "/navigator",
    label: "Patients",
    icon: LayoutDashboard,
    match: (path: string) =>
      path === "/navigator" || path.startsWith("/navigator/patient/"),
  },
  {
    href: "/navigator/calls",
    label: "Reminder calls",
    icon: PhoneCall,
    match: (path: string) => path.startsWith("/navigator/calls"),
  },
  {
    href: "/navigator/tasks",
    label: "Work queue",
    icon: ClipboardList,
    match: (path: string) => path.startsWith("/navigator/tasks"),
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Administrator",
  navigator: "Navigator",
  patient: "Patient",
  caregiver: "Caregiver",
};

export function AppHeader({ showReset = false }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const resetDemo = useCompassStore((state) => state.resetDemo);

  const homeHref = user ? getHomeRouteForRole(user.role) : "/";
  const isNavigator = user?.role === "navigator";

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 sm:px-8">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-2.5 py-3 text-pine-deep"
        >
          <CompassMark />
          <span className="text-lg font-bold">Compass</span>
        </Link>

        {isNavigator && (
          <nav aria-label="Main" className="hidden self-stretch md:flex">
            {NAVIGATOR_LINKS.map((link) => (
              <NavLink key={link.href} {...link} active={link.match(pathname)} />
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <p className="hidden text-right text-sm leading-tight sm:block">
              <span className="block max-w-56 truncate font-semibold text-ink">
                {user.email}
              </span>
              <span className="text-ink-soft">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </p>
          )}

          {showReset && (
            <button
              type="button"
              onClick={resetDemo}
              title="Reset demo data"
              aria-label="Reset demo data"
              className="rounded-lg p-2 text-ink-soft hover:bg-surface-soft hover:text-ink"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-soft hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>

      {isNavigator && (
        <nav
          aria-label="Main"
          className="flex overflow-x-auto border-t border-border px-2 md:hidden"
        >
          {NAVIGATOR_LINKS.map((link) => (
            <NavLink key={link.href} {...link} active={link.match(pathname)} />
          ))}
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof PhoneCall;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3 text-[0.95rem] font-semibold transition-colors ${
        active
          ? "border-pine text-pine-deep"
          : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {label}
    </Link>
  );
}
