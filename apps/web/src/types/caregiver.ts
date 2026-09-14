export type CaregiverPermission =
  | "appointments"
  | "transportation"
  | "care_tasks"
  | "proxy_check_in"
  | "documents";


export type CaregiverAppointment = {
  appointment_id: string;

  title: string;

  scheduled_start: string;

  scheduled_end: string | null;

  status:
    | "scheduled"
    | "completed"
    | "cancelled"
    | "missed";

  appointment_type: string | null;

  provider_name: string | null;

  department: string | null;

  location_name: string | null;

  address_text: string | null;
};


export type CaregiverPortalPatient = {
  patient_id: string;

  first_name: string;

  last_name: string;

  relationship: string;

  permissions: CaregiverPermission[];

  next_appointment:
    | CaregiverAppointment
    | null;
};


export type CaregiverPortalResponse = {
  caregiver_first_name: string;

  caregiver_last_name: string;

  patients: CaregiverPortalPatient[];
};


export type CaregiverCheckInRequest = {
  symptom_severity: number | null;

  transportation_confirmed:
    | boolean
    | null;

  medication_access_issue: boolean;

  financial_concern: boolean;

  requested_help: boolean;

  free_text: string | null;
};


export type CaregiverCheckInResponse = {
  id: string;

  patient_id: string;

  source: "caregiver";

  symptom_severity: number | null;

  transportation_confirmed:
    | boolean
    | null;

  medication_access_issue: boolean;

  financial_concern: boolean;

  requested_help: boolean;

  free_text: string | null;

  created_at: string;
};


export type CaregiverDocument = {
  id: string;

  patient_id: string;

  document_type: string;

  original_filename: string;

  content_type: string;

  file_size_bytes: number;

  uploaded_by_user_id: string;

  patient_visible: boolean;

  created_at: string;
};


export type CaregiverDocumentAccessResponse = {
  url: string;

  expires_in_seconds: number;
};