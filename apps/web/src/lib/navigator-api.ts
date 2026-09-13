import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  NavigationTaskCreateRequest,
  NavigationTaskResponse,
  NavigationTaskUpdateRequest,
  NavigatorDashboardResponse,
  NavigatorTaskQueueItem,
  Patient360Response,
} from "@/types/navigator";

export async function getNavigatorDashboard():
Promise<NavigatorDashboardResponse> {
  return authenticatedApiRequest<
    NavigatorDashboardResponse
  >(
    "/navigator/dashboard",
    {
      method: "GET",
    },
  );
}

export async function getPatient360(
  patientId: string,
): Promise<Patient360Response> {
  return authenticatedApiRequest<
    Patient360Response
  >(
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

export async function createNavigationTask(
  patientId: string,
  needId: string,
  payload: NavigationTaskCreateRequest = {},
): Promise<NavigationTaskResponse> {
  return authenticatedApiRequest<
    NavigationTaskResponse
  >(
    `/patients/${patientId}/needs/${needId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateNavigationTask(
  patientId: string,
  taskId: string,
  payload: NavigationTaskUpdateRequest,
): Promise<NavigationTaskResponse> {
  return authenticatedApiRequest<
    NavigationTaskResponse
  >(
    `/patients/${patientId}/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function getNavigatorTasks():
Promise<NavigatorTaskQueueItem[]> {
  return authenticatedApiRequest<
    NavigatorTaskQueueItem[]
  >(
    "/navigator/tasks",
    {
      method: "GET",
    },
  );
}