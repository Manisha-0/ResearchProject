import {
  getAccessToken,
} from "@/lib/auth-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  detail?: string;

  constructor(
    message: string,
    status: number,
    detail?: string
  ) {
    super(message);

    this.name = "ApiError";

    this.status = status;

    this.detail = detail;
  }
}

type ApiRequestOptions =
  RequestInit & {
    token?: string | null;
  };

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    token,
    headers,
    ...fetchOptions
  } = options;

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...fetchOptions,

      headers: {
        "Content-Type":
          "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),

        ...headers,
      },
    }
  );

  if (!response.ok) {
    let detail:
      | string
      | undefined;

    try {
      const body =
        await response.json();

      if (
        typeof body?.detail ===
        "string"
      ) {
        detail = body.detail;
      }
    } catch {
      // Response did not contain
      // a JSON error body.
    }

    throw new ApiError(
      detail ??
        `Request failed with status ${response.status}`,
      response.status,
      detail
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function authenticatedApiRequest<
  T
>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    getAccessToken();

  if (!token) {
    throw new ApiError(
      "Authentication required.",
      401
    );
  }

  return apiRequest<T>(
    path,
    {
      ...options,
      token,
    }
  );
}