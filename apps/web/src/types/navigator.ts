export type AttentionStatus =
  | "needs_attention"
  | "follow_up"
  | "on_track";

export type NavigationTaskStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type NavigationNeedStatus =
  | "open"
  | "resolved";

export type CheckInSource =
  | "patient"
  | "caregiver";

export type CaregiverAccessStatus =
  | "pending_patient_approval"
  | "invited"
  | "active"
  | "revoked";

export type CaregiverPermissionType =
  | "appointments"
  | "transportation"
  | "care_tasks"
  | "proxy_check_in"
  | "documents";

/* Navigator dashboard*/


export type NavigatorDashboardCounts = {
  total_patients: number;

  needs_attention: number;

  follow_up: number;

  on_track: number;

  open_tasks: number;

  in_progress_tasks: number;
};

export type NavigatorDashboardPatient = {
  patient_id: string;

  first_name: string;

  last_name: string;

  care_program: string | null;

  attention_status: AttentionStatus;

  explanation: string;

  open_need_count: number;

  next_appointment_at: string | null;
};

export type NavigatorDashboardTask = {
  task_id: string;

  patient_id: string;

  patient_first_name: string;

  patient_last_name: string;

  title: string;

  status: NavigationTaskStatus;

  due_at: string | null;
};

export type NavigatorDashboardResponse = {
  counts: NavigatorDashboardCounts;

  patients: NavigatorDashboardPatient[];

  tasks: NavigatorDashboardTask[];
};


/* Patient 360 */

export type Patient360Profile = {
  patient_id: string;

  user_id: string;

  first_name: string;

  last_name: string;

  date_of_birth: string;

  email: string;

  phone: string | null;

  preferred_language: string | null;

  preferred_contact_method: string | null;

  care_program: string | null;

  external_patient_reference: string | null;
};

export type Patient360Appointment = {
  appointment_id: string;

  journey_item_id: string;

  title: string;

  scheduled_start: string;

  scheduled_end: string | null;

  status: string;

  appointment_type: string | null;

  provider_name: string | null;

  department: string | null;

  location_name: string | null;
};

export type Patient360CheckIn = {
  check_in_id: string;

  source: CheckInSource;

  symptom_severity: number | null;

  transportation_confirmed: boolean | null;

  medication_access_issue: boolean;

  financial_concern: boolean;

  requested_help: boolean;

  free_text: string | null;

  created_at: string;
};

export type Patient360Caregiver = {
  caregiver_access_id: string;

  caregiver_user_id: string;

  first_name: string;

  last_name: string;

  relationship: string;

  status: CaregiverAccessStatus;

  permissions: CaregiverPermissionType[];
};

export type Patient360Need = {
  need_id: string;

  need_type: string;

  title: string;

  explanation: string;

  recommended_action: string | null;

  attention_status: AttentionStatus;

  status: NavigationNeedStatus;

  due_at: string | null;
};

export type Patient360Task = {
  task_id: string;

  navigation_need_id: string;

  title: string;

  description: string | null;

  status: NavigationTaskStatus;

  due_at: string | null;

  completed_at: string | null;

  resolution_note: string | null;
};

export type Patient360Attention = {
  status: AttentionStatus;

  explanation: string;

  open_need_count: number;
};

export type Patient360Response = {
  profile: Patient360Profile;

  attention: Patient360Attention;

  upcoming_appointments: Patient360Appointment[];

  recent_check_ins: Patient360CheckIn[];

  caregivers: Patient360Caregiver[];

  open_needs: Patient360Need[];

  active_tasks: Patient360Task[];
};