import {
  ReactNode,
} from "react";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

interface NavigatorLayoutProps {
  children: ReactNode;
}

export default function NavigatorLayout({
  children,
}: NavigatorLayoutProps) {
  return (
    <RoleGuard
      allowedRoles={[
        "navigator",
      ]}
    >
      {children}
    </RoleGuard>
  );
}