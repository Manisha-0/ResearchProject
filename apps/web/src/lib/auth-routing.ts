import type {
  UserRole,
} from "@/types/auth";

export function getHomeRouteForRole(
  role: UserRole
): string {
  switch (role) {
    case "navigator":
      return "/navigator";

    case "patient":
      return "/patient";

    case "caregiver":
      return "/caregiver";

    case "super_admin":
      return "/";

    default:
      return "/";
  }
}