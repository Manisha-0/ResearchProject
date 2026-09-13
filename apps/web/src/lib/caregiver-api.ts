import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  CaregiverCheckInRequest,
  CaregiverCheckInResponse,
  CaregiverPortalResponse,
} from "@/types/caregiver";

export async function getCaregiverPortal():
Promise<CaregiverPortalResponse> {
  return authenticatedApiRequest<
    CaregiverPortalResponse
  >("/caregiver/portal", {
    method: "GET",
  });
}

export async function submitCaregiverCheckIn(
  patientId: string,
  payload: CaregiverCheckInRequest,
): Promise<CaregiverCheckInResponse> {
  return authenticatedApiRequest<
    CaregiverCheckInResponse
  >(
    `/me/check-ins/caregiver/patients/${patientId}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}