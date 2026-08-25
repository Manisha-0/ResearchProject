"use client";

import { HeartHandshake, Stethoscope, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type Role = "patient" | "caregiver" | "navigator";

type RoleSwitcherProps = {
  currentRole: Role;
};

const roles = [
  {
    id: "patient" as const,
    label: "Patient",
    path: "/patient",
    icon: UserRound,
  },
  {
    id: "caregiver" as const,
    label: "Caregiver",
    path: "/caregiver",
    icon: HeartHandshake,
  },
  {
    id: "navigator" as const,
    label: "Navigator",
    path: "/navigator",
    icon: Stethoscope,
  },
];

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  function switchRole(role: (typeof roles)[number]) {
    if (pathname === role.path) {
      return;
    }

    router.push(role.path);
  }

  return (
    <div className="flex items-center rounded-xl bg-surface-soft p-1">
      {roles.map((role) => {
        const Icon = role.icon;
        const active = role.id === currentRole;

        return (
          <button
            key={role.id}
            type="button"
            onClick={() => switchRole(role)}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
              active
                ? "bg-white text-navy shadow-sm"
                : "text-ink-soft hover:text-navy",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />

            <span className="hidden md:inline">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
