import { authenticatedApiRequest } from "@/lib/api";

import type {
  NavigatorDashboardResponse,
  Patient360Response,
} from "@/types/navigator";

export async function getNavigatorDashboard(): Promise<NavigatorDashboardResponse> {
  return authenticatedApiRequest<NavigatorDashboardResponse>(
    "/navigator/dashboard",
    {
      method: "GET",
    },
  );
}

export async function getPatient360(
  patientId: string,
): Promise<Patient360Response> {
  return authenticatedApiRequest<Patient360Response>(
    `/patients/${patientId}/360`,
    {
      method: "GET",
    },
  );
}

export async function resolveNavigationNeed(
  patientId: string,
  needId: string,
): Promise<void> {
  await authenticatedApiRequest(
    `/patients/${patientId}/attention/needs/${needId}/resolve`,
    {
      method: "PATCH",
    },
  );
}