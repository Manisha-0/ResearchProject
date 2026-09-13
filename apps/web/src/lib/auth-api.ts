import {
  apiRequest,
} from "@/lib/api";

import type {
  AccountActivateRequest,
  AccountActivateResponse,
  CaregiverActivateRequest,
  CaregiverActivationValidateRequest,
  CaregiverActivationValidateResponse,
  CurrentUser,
  InvitationValidateRequest,
  InvitationValidateResponse,
  LoginRequest,
  LoginResponse,
  PatientActivateRequest,
  PatientActivationValidateRequest,
  PatientActivationValidateResponse,
} from "@/types/auth";


export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function getCurrentUser(
  token: string,
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>(
    "/auth/me",
    {
      method: "GET",

      token,
    },
  );
}


/* Navigator activation */

export async function validateInvitation(
  payload: InvitationValidateRequest,
): Promise<InvitationValidateResponse> {
  return apiRequest<
    InvitationValidateResponse
  >(
    "/auth/activate/validate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function activateAccount(
  payload: AccountActivateRequest,
): Promise<AccountActivateResponse> {
  return apiRequest<
    AccountActivateResponse
  >(
    "/auth/activate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


/* Patient activation */

export async function validatePatientInvitation(
  payload: PatientActivationValidateRequest,
): Promise<PatientActivationValidateResponse> {
  return apiRequest<
    PatientActivationValidateResponse
  >(
    "/auth/patient-activate/validate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function activatePatientAccount(
  payload: PatientActivateRequest,
): Promise<AccountActivateResponse> {
  return apiRequest<
    AccountActivateResponse
  >(
    "/auth/patient-activate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


/* Caregiver activation */

export async function validateCaregiverInvitation(
  payload: CaregiverActivationValidateRequest,
): Promise<CaregiverActivationValidateResponse> {
  return apiRequest<
    CaregiverActivationValidateResponse
  >(
    "/auth/caregiver-activate/validate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function activateCaregiverAccount(
  payload: CaregiverActivateRequest,
): Promise<AccountActivateResponse> {
  return apiRequest<
    AccountActivateResponse
  >(
    "/auth/caregiver-activate",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}