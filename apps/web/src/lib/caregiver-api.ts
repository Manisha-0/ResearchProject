import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  CaregiverCheckInRequest,
  CaregiverCheckInResponse,
  CaregiverDocument,
  CaregiverDocumentAccessResponse,
  CaregiverPortalResponse,
} from "@/types/caregiver";


export async function getCaregiverPortal():
Promise<CaregiverPortalResponse> {
  return authenticatedApiRequest<
    CaregiverPortalResponse
  >(
    "/caregiver/portal",
    {
      method: "GET",
    },
  );
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

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function getCaregiverDocuments(
  patientId: string,
): Promise<CaregiverDocument[]> {
  return authenticatedApiRequest<
    CaregiverDocument[]
  >(
    `/caregiver/patients/${patientId}/documents`,
    {
      method: "GET",
    },
  );
}


export async function createCaregiverDocumentAccess(
  patientId: string,
  documentId: string,
): Promise<CaregiverDocumentAccessResponse> {
  return authenticatedApiRequest<
    CaregiverDocumentAccessResponse
  >(
    `/caregiver/patients/${patientId}/documents/${documentId}/access`,
    {
      method: "POST",
    },
  );
}