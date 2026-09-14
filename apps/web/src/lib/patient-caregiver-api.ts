import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  AddPatientCaregiverRequest,
  CaregiverApprovalRequest,
  CaregiverApprovalResponse,
  CaregiverPermissionUpdateRequest,
  CaregiverPermissionUpdateResponse,
  CaregiverRevokeResponse,
  PatientCaregiver,
} from "@/types/patient-caregiver";


export async function getMyCaregivers():
Promise<PatientCaregiver[]> {
  return authenticatedApiRequest<
    PatientCaregiver[]
  >("/me/caregivers", {
    method: "GET",
  });
}


export async function addMyCaregiver(
  payload: AddPatientCaregiverRequest,
): Promise<PatientCaregiver> {
  return authenticatedApiRequest<
    PatientCaregiver
  >("/me/caregivers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function approveMyCaregiver(
  caregiverAccessId: string,
  payload: CaregiverApprovalRequest,
): Promise<CaregiverApprovalResponse> {
  return authenticatedApiRequest<
    CaregiverApprovalResponse
  >(
    `/me/caregivers/${caregiverAccessId}/approve`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function declineMyCaregiver(
  caregiverAccessId: string,
): Promise<{ message: string }> {
  return authenticatedApiRequest<{
    message: string;
  }>(
    `/me/caregivers/${caregiverAccessId}/decline`,
    {
      method: "POST",
    },
  );
}


export async function updateMyCaregiverPermissions(
  caregiverAccessId: string,
  payload: CaregiverPermissionUpdateRequest,
): Promise<CaregiverPermissionUpdateResponse> {
  return authenticatedApiRequest<
    CaregiverPermissionUpdateResponse
  >(
    `/me/caregivers/${caregiverAccessId}/permissions`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export async function revokeMyCaregiver(
  caregiverAccessId: string,
): Promise<CaregiverRevokeResponse> {
  return authenticatedApiRequest<
    CaregiverRevokeResponse
  >(
    `/me/caregivers/${caregiverAccessId}/revoke`,
    {
      method: "POST",
    },
  );
}