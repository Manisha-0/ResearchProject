import {
  Patient,
  PriorityReason,
  PriorityResult,
  PriorityTier,
} from "@/lib/types";

export const PRIORITY_WEIGHTS = {
  treatmentWithin48Hours: 30,
  transportationUnresolved: 25,
  severeSymptom: 20,
  authorizationPending: 15,
  medicationTrouble: 12,
} as const;

function getLatestCheckIn(patient: Patient) {
  return patient.checkIns[0] ?? null;
}

export function getPriorityTier(score: number): PriorityTier {
  if (score >= 70) {
    return "high";
  }

  if (score >= 35) {
    return "medium";
  }

  return "low";
}

export function computePriority(patient: Patient): PriorityResult {
  const reasons: PriorityReason[] = [];

  const latestCheckIn = getLatestCheckIn(patient);

  if (patient.nextTreatment.within48Hours) {
    reasons.push({
      key: "treatment",
      label: "Treatment scheduled within 48 hours",
      points: PRIORITY_WEIGHTS.treatmentWithin48Hours,
    });
  }

  const transportStatus =
    latestCheckIn?.transportStatus ??
    patient.baselineTransportStatus;

  if (transportStatus !== "confirmed") {
    reasons.push({
      key: "transportation",
      label: "Transportation is not confirmed",
      points: PRIORITY_WEIGHTS.transportationUnresolved,
    });
  }

  if (latestCheckIn?.nausea === "severe") {
    reasons.push({
      key: "symptom",
      label: "Severe nausea reported today",
      points: PRIORITY_WEIGHTS.severeSymptom,
    });
  }

  if (patient.authorizationPending) {
    reasons.push({
      key: "authorization",
      label: "Treatment authorization remains pending",
      points: PRIORITY_WEIGHTS.authorizationPending,
    });
  }

  if (latestCheckIn?.medicationStatus === "having_trouble") {
    reasons.push({
      key: "medication",
      label: "Medication access or adherence concern",
      points: PRIORITY_WEIGHTS.medicationTrouble,
    });
  }

  const score = Math.min(
    reasons.reduce((total, reason) => total + reason.points, 0),
    100,
  );

  return {
    score,
    tier: getPriorityTier(score),
    reasons,
  };
}