import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  AdminNavigator,
  NavigatorCreateRequest,
  NavigatorCreateResponse,
} from "@/types/admin";

export async function getAdminNavigators():
Promise<AdminNavigator[]> {
  return authenticatedApiRequest<
    AdminNavigator[]
  >(
    "/admin/navigators",
    {
      method: "GET",
    },
  );
}

export async function createNavigator(
  payload: NavigatorCreateRequest,
): Promise<NavigatorCreateResponse> {
  return authenticatedApiRequest<
    NavigatorCreateResponse
  >(
    "/admin/navigators",
    {
      method: "POST",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}