export type CaregiverPermission =
  | "appointments"
  | "transportation"
  | "care_tasks"
  | "proxy_check_in"
  | "documents";

export type CaregiverAccessStatus =
  | "pending_patient_approval"
  | "invited"
  | "active"
  | "revoked";

export type PatientCaregiver = {
  caregiver_access_id: string;
  caregiver_user_id: string;
  caregiver_name: string;
  email: string;
  relationship: string;
  status: CaregiverAccessStatus;
  permissions: CaregiverPermission[];
};

export type AddPatientCaregiverRequest = {
  first_name: string;
  last_name: string;
  email: string;
  relationship: string;
  phone: string | null;
  permissions: CaregiverPermission[];
};

export type CaregiverApprovalRequest = {
  permissions: CaregiverPermission[];
};

export type CaregiverApprovalResponse = {
  caregiver_access_id: string;
  status: CaregiverAccessStatus;
  permissions: CaregiverPermission[];
  message: string;
};

export type CaregiverPermissionUpdateRequest = {
  permissions: CaregiverPermission[];
};

export type CaregiverPermissionUpdateResponse = {
  caregiver_access_id: string;
  permissions: CaregiverPermission[];
  message: string;
};

export type CaregiverRevokeResponse = {
  caregiver_access_id: string;
  status: CaregiverAccessStatus;
  message: string;
};