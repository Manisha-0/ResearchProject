import type {
  UserRole,
} from "@/types/auth";

export function getHomeRouteForRole(
  role: UserRole,
): string {
  switch (role) {
    case "super_admin":
      return "/admin";

    case "navigator":
      return "/navigator";

    case "patient":
      return "/patient";

    case "caregiver":
      return "/caregiver";

    default:
      return "/";
  }
}