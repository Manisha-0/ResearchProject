import {
  ReactNode,
} from "react";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

interface CaregiverLayoutProps {
  children: ReactNode;
}

export default function CaregiverLayout({
  children,
}: CaregiverLayoutProps) {
  return (
    <RoleGuard
      allowedRoles={[
        "caregiver",
      ]}
    >
      {children}
    </RoleGuard>
  );
}