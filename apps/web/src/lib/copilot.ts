import type { Patient } from "@/lib/types";
import { computePriority } from "@/lib/scoring";

export type CopilotPrompt =
  | "attention"
  | "call_prep"
  | "changes";

export interface CopilotResponse {
  title: string;
  intro?: string;
  bullets: string[];
  footer?: string;
}

export function getCopilotResponse(
  patient: Patient,
  prompt: CopilotPrompt,
): CopilotResponse {
  const priority = computePriority(patient);

  const latestCheckIn =
    patient.checkIns[0] ?? null;

  const previousCheckIn =
    patient.checkIns[1] ?? null;

  const activeGaps = patient.careGaps.filter(
    (gap) => gap.status !== "resolved",
  );

  if (prompt === "attention") {
    return {
      title: "What needs attention today",

      intro: `${patient.firstName} currently has a Navigation Priority of ${priority.score}.`,

      bullets: priority.reasons.map(
        (reason) => reason.label,
      ),

      footer:
        "Priority is based on transparent navigation rules, not a clinical-risk model.",
    };
  }

  if (prompt === "call_prep") {
    const bullets: string[] = [];

    const transportGap = activeGaps.some(
      (gap) => gap.type === "transportation",
    );

    const symptomGap = activeGaps.some(
      (gap) => gap.type === "symptom",
    );

    const authorizationGap = activeGaps.some(
      (gap) => gap.type === "authorization",
    );

    const medicationGap = activeGaps.some(
      (gap) => gap.type === "medication",
    );

    if (transportGap) {
      bullets.push(
        `Confirm transportation for ${patient.nextTreatment.date.toLowerCase()}'s ${patient.nextTreatment.time} treatment.`,
      );
    }

    if (symptomGap) {
      bullets.push(
        "Review the severe nausea reported in the latest check-in and determine whether care-team follow-up is needed.",
      );
    }

    if (authorizationGap) {
      bullets.push(
        "Verify whether treatment authorization has cleared before the upcoming appointment.",
      );
    }

    if (medicationGap) {
      bullets.push(
        "Ask whether the medication access issue has been resolved.",
      );
    }

    if (latestCheckIn?.note) {
      bullets.push(
        `Patient note: “${latestCheckIn.note}”`,
      );
    }

    if (bullets.length === 0) {
      bullets.push(
        "No active navigation barriers are currently recorded.",
      );
    }

    return {
      title: `Prepare my call with ${patient.firstName}`,

      intro:
        "Suggested navigation talking points based on the current Compass record.",

      bullets,

      footer:
        "Compass summarizes the record. The navigator decides what action to take.",
    };
  }

  const changes: string[] = [];

  if (!latestCheckIn) {
    changes.push(
      "No patient check-in has been submitted yet.",
    );
  } else if (!previousCheckIn) {
    changes.push(
      "This is the first check-in available in the current demo record.",
    );

    if (
      latestCheckIn.transportStatus !==
      "confirmed"
    ) {
      changes.push(
        "Transportation is no longer confirmed.",
      );
    }

    if (latestCheckIn.nausea === "severe") {
      changes.push(
        "Severe nausea was reported.",
      );
    }

    if (
      latestCheckIn.medicationStatus ===
      "having_trouble"
    ) {
      changes.push(
        "A medication concern was reported.",
      );
    }
  } else {
    if (
      latestCheckIn.transportStatus !==
      previousCheckIn.transportStatus
    ) {
      changes.push(
        `Transportation changed from ${formatValue(
          previousCheckIn.transportStatus,
        )} to ${formatValue(
          latestCheckIn.transportStatus,
        )}.`,
      );
    }

    if (
      latestCheckIn.nausea !==
      previousCheckIn.nausea
    ) {
      changes.push(
        `Nausea changed from ${formatValue(
          previousCheckIn.nausea,
        )} to ${formatValue(
          latestCheckIn.nausea,
        )}.`,
      );
    }

    if (
      latestCheckIn.medicationStatus !==
      previousCheckIn.medicationStatus
    ) {
      changes.push(
        `Medication status changed from ${formatValue(
          previousCheckIn.medicationStatus,
        )} to ${formatValue(
          latestCheckIn.medicationStatus,
        )}.`,
      );
    }

    if (changes.length === 0) {
      changes.push(
        "No major structured changes were detected since the previous check-in.",
      );
    }
  }

  return {
    title: "What changed since the last check-in",

    bullets: changes,

    footer:
      "Changes are derived from the patient's synthetic Compass history.",
  };
}

function formatValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}