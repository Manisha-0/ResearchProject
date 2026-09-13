import { authenticatedApiRequest } from "@/lib/api";

import type {
  CheckInCreateRequest,
  CheckInResponse,
  PatientJourneyItem,
} from "@/types/patient";

export async function getMyJourney(): Promise<
  PatientJourneyItem[]
> {
  return authenticatedApiRequest<
    PatientJourneyItem[]
  >("/me/journey", {
    method: "GET",
  });
}

export async function submitMyCheckIn(
  payload: CheckInCreateRequest,
): Promise<CheckInResponse> {
  return authenticatedApiRequest<CheckInResponse>(
    "/me/check-ins",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}