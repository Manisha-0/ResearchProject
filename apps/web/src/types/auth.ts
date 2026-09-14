export type UserRole =
  | "super_admin"
  | "navigator"
  | "patient"
  | "caregiver";

export type UserStatus =
  | "pending"
  | "active"
  | "suspended"
  | "disabled";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type CurrentUser = {
  id: string;

  organization_id: string;

  email: string;

  role: UserRole;

  status: UserStatus;
};


/* Account activation */

export type ActivationType =
  | "navigator"
  | "patient"
  | "caregiver";

export type InvitationValidateRequest = {
  token: string;
};

export type InvitationValidateResponse = {
  valid: boolean;

  email: string;

  role: UserRole;
};

export type AccountActivateRequest = {
  token: string;

  password: string;
};

export type AccountActivateResponse = {
  message: string;
};


/* Patient activation */

export type PatientActivationValidateRequest = {
  token: string;

  date_of_birth: string;
};

export type PatientActivationValidateResponse = {
  valid: boolean;

  email: string;

  first_name: string;
};

export type PatientActivateRequest = {
  token: string;

  date_of_birth: string;

  password: string;
};


/* Caregiver activation */

export type CaregiverActivationValidateRequest = {
  token: string;
};

export type CaregiverActivationValidateResponse = {
  valid: boolean;

  email: string;

  first_name: string;
};

export type CaregiverActivateRequest = {
  token: string;

  password: string;
};