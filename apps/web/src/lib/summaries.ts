import type { Patient } from "@/lib/types";

export function buildNavigatorSummary(
  patient: Patient,
): string {
  const latestCheckIn = patient.checkIns[0];

  const parts: string[] = [];

  if (patient.nextTreatment.within48Hours) {
    parts.push(
      `${patient.firstName} has ${patient.nextTreatment.label.toLowerCase()} scheduled ${patient.nextTreatment.date.toLowerCase()} at ${patient.nextTreatment.time}.`,
    );
  }

  if (
    latestCheckIn &&
    latestCheckIn.transportStatus !== "confirmed"
  ) {
    parts.push(
      "Transportation is not currently confirmed.",
    );
  }

  if (latestCheckIn?.nausea === "severe") {
    parts.push(
      "Severe nausea was reported in today's check-in.",
    );
  }

  if (patient.authorizationPending) {
    parts.push(
      "Treatment authorization also remains pending.",
    );
  }

  if (
    latestCheckIn?.medicationStatus ===
    "having_trouble"
  ) {
    parts.push(
      "The patient also reported a medication concern.",
    );
  }

  if (parts.length === 0) {
    return `${patient.firstName} has no active navigation concerns requiring immediate follow-up.`;
  }

  return parts.join(" ");
}