import type {
  Patient,
  PatientDocument,
} from "@/lib/types";

import { computePriority } from "@/lib/scoring";

export type AdminBrief = {
  headline: string;
  tasks: string[];
};

export function buildAdministrativeBrief(
  patient: Patient,
): AdminBrief {
  const priority = computePriority(patient);

  const tasks: string[] = [];

  const activeGaps = patient.careGaps.filter(
    (gap) => gap.status !== "resolved",
  );

  if (
    activeGaps.some(
      (gap) => gap.type === "transportation",
    )
  ) {
    tasks.push(
      "Confirm transportation before the upcoming treatment.",
    );
  }

  if (
    activeGaps.some(
      (gap) => gap.type === "authorization",
    )
  ) {
    tasks.push(
      "Follow up on the pending treatment authorization.",
    );
  }

  if (
    activeGaps.some(
      (gap) => gap.type === "symptom",
    )
  ) {
    tasks.push(
      "Review the latest symptom report and route it to the care team if appropriate.",
    );
  }

  if (
    activeGaps.some(
      (gap) => gap.type === "medication",
    )
  ) {
    tasks.push(
      "Follow up on the reported medication access issue.",
    );
  }

  const nextAppointment =
    patient.appointments.find(
      (appointment) =>
        appointment.status === "scheduled",
    );

  if (nextAppointment) {
    tasks.push(
      `Prepare the patient for ${nextAppointment.title} on ${nextAppointment.date} at ${nextAppointment.time}.`,
    );
  }

  if (tasks.length === 0) {
    tasks.push(
      "No immediate administrative follow-up is identified.",
    );
  }

  return {
    headline: `${patient.firstName} has a Navigation Priority of ${priority.score}. Compass found ${tasks.length} administrative item${
      tasks.length === 1 ? "" : "s"
    } to review.`,
    tasks,
  };
}

export function createPatientFriendlyDocumentSummary(
  title: string,
  sourceText: string,
): string {
  const cleaned = sourceText
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return `${title} was added to your Compass care record. Your care team can review this document with you if you have questions.`;
  }

  const shortened =
    cleaned.length > 220
      ? `${cleaned.slice(0, 217)}...`
      : cleaned;

  return `In plain language: ${shortened}`;
}

export function getMostRecentDocument(
  patient: Patient,
): PatientDocument | null {
  return patient.documents[0] ?? null;
}