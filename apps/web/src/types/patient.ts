export type JourneyItemType =
  | "appointment"
  | "treatment"
  | "referral"
  | "follow_up"
  | "care_task"
  | "document"
  | "milestone";

export type JourneyItemStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "missed";

export type CheckInSource =
  | "patient"
  | "caregiver"
  | "voice_call";

export type PatientAppointment = {
  id: string;
  patient_id: string;
  journey_item_id: string;

  title: string;

  scheduled_start: string;
  scheduled_end: string | null;

  status: AppointmentStatus;

  appointment_type: string | null;
  provider_name: string | null;
  department: string | null;
  location_name: string | null;
  address_text: string | null;
  notes: string | null;
};

export type PatientJourneyItem = {
  id: string;

  item_type: JourneyItemType;
  status: JourneyItemStatus;

  title: string;
  description: string | null;

  scheduled_at: string | null;
  completed_at: string | null;

  patient_visible: boolean;

  appointment: PatientAppointment | null;
};

export type CheckInCreateRequest = {
  symptom_severity: number | null;

  transportation_confirmed: boolean | null;

  medication_access_issue: boolean;

  financial_concern: boolean;

  requested_help: boolean;

  free_text: string | null;
};

export type CheckInResponse = {
  id: string;
  patient_id: string;

  source: CheckInSource;

  symptom_severity: number | null;

  transportation_confirmed: boolean | null;

  medication_access_issue: boolean;

  financial_concern: boolean;

  requested_help: boolean;

  free_text: string | null;

  created_at: string;
};