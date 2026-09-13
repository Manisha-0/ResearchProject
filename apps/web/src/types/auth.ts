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