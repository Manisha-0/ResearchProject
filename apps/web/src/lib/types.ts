export type PriorityTier = "high" | "medium" | "low";

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