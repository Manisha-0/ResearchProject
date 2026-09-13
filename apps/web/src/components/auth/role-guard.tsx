"use client";

import {
  ReactNode,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getHomeRouteForRole,
} from "@/lib/auth-routing";

import {
  useAuthStore,
} from "@/store/auth-store";

import type {
  UserRole,
} from "@/types/auth";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const router =
    useRouter();

  const user =
    useAuthStore(
      (state) =>
        state.user
    );

  const isLoading =
    useAuthStore(
      (state) =>
        state.isLoading
    );

  const isAuthenticated =
    useAuthStore(
      (state) =>
        state.isAuthenticated
    );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (
      !isAuthenticated ||
      !user
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    if (
      !allowedRoles.includes(
        user.role
      )
    ) {
      router.replace(
        getHomeRouteForRole(
          user.role
        )
      );
    }
  }, [
    allowedRoles,
    isAuthenticated,
    isLoading,
    router,
    user,
  ]);

  if (
    isLoading ||
    !user ||
    !isAuthenticated
  ) {
    return null;
  }

  if (
    !allowedRoles.includes(
      user.role
    )
  ) {
    return null;
  }

  return children;
}