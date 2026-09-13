import {
  apiRequest,
} from "@/lib/api";

import type {
  CurrentUser,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

export async function login(
  payload: LoginRequest
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );
}

export async function getCurrentUser(
  token: string
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>(
    "/auth/me",
    {
      method: "GET",

      token,
    }
  );
}