export type UserRole =
  | "patient"
  | "caregiver"
  | "navigator";

export type PriorityTier =
  | "high"
  | "medium"
  | "low";

export type SymptomSeverity =
  | "none"
  | "mild"
  | "moderate"
  | "severe";

export type TransportStatus =
  | "confirmed"
  | "not_sure"
  | "unavailable";

export type MedicationStatus =
  | "on_track"
  | "having_trouble";

export type CareGapType =
  | "transportation"
  | "symptom"
  | "authorization"
  | "medication"
  | "caregiver";

export type CareGapStatus =
  | "open"
  | "in_progress"
  | "resolved";

export type CaregiverPermission =
  | "appointments"
  | "transportation"
  | "care_tasks"
  | "proxy_check_in"
  | "clinical_notes"
  | "navigator_notes";

export type JourneyStatus =
  | "completed"
  | "current"
  | "upcoming";

export type JourneyItemType =
  | "diagnosis"
  | "consultation"
  | "treatment_plan"
  | "treatment"
  | "appointment"
  | "support"
  | "survivorship";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled";

export type DocumentCategory =
  | "care_plan"
  | "treatment"
  | "insurance"
  | "education"
  | "other";

export interface DemoSession {
  userId: string;
  name: string;
  role: UserRole;
  patientId?: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  patientId?: string;
}

export interface CareGap {
  id: string;
  type: CareGapType;
  title: string;
  description: string;
  status: CareGapStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CheckIn {
  id: string;
  createdAt: string;
  nausea: SymptomSeverity;
  transportStatus: TransportStatus;
  medicationStatus: MedicationStatus;
  note: string;
  submittedBy: {
    id: string;
    name: string;
    role: "patient" | "caregiver";
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: AppointmentStatus;
  createdAt: string;
  createdBy: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  sourceText: string;
  patientFriendlySummary: string;
}

export interface JourneyItem {
  id: string;
  patientId: string;
  type: JourneyItemType;
  title: string;
  detail: string;
  date: string;
  status: JourneyStatus;
  updatedBy: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  age: number;
  cancerType: string;
  stage: string;
  nextTreatment: {
    label: string;
    date: string;
    time: string;

    within48Hours: boolean;
  };

  authorizationPending: boolean;
  baselineTransportStatus: TransportStatus;
  checkIns: CheckIn[];
  careGaps: CareGap[];
  appointments: Appointment[];
  documents: PatientDocument[];
  journey: JourneyItem[];
}

export interface Caregiver {
  id: string;

  patientId: string;

  firstName: string;
  lastName: string;

  relationship: string;

  status:
    | "invited"
    | "active"
    | "revoked";

  permissions: CaregiverPermission[];

  invitedBy: string;

  approvedByPatient: boolean;
}

export interface PriorityReason {
  key:
    | "treatment"
    | "transportation"
    | "symptom"
    | "authorization"
    | "medication";

  label: string;

  points: number;
}

export interface PriorityResult {
  score: number;
  tier: PriorityTier;
  reasons: PriorityReason[];
}