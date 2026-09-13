import {
  ReactNode,
} from "react";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

interface PatientLayoutProps {
  children: ReactNode;
}

export default function PatientLayout({
  children,
}: PatientLayoutProps) {
  return (
    <RoleGuard
      allowedRoles={[
        "patient",
      ]}
    >
      {children}
    </RoleGuard>
  );
}