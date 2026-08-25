"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { seedPatients } from "@/lib/data";
import {
  CareGap,
  CheckIn,
  Patient,
} from "@/lib/types";

type SubmitCheckInInput = {
  nausea: CheckIn["nausea"];
  transportStatus: CheckIn["transportStatus"];
  medicationStatus: CheckIn["medicationStatus"];
  note: string;
};

type CompassStore = {
  patients: Patient[];

  getPatient: (patientId: string) => Patient | undefined;

  submitCheckIn: (
    patientId: string,
    input: SubmitCheckInInput,
  ) => void;

  resolveGap: (
    patientId: string,
    gapId: string,
    resolvedBy?: string,
  ) => void;

  resetDemo: () => void;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const useCompassStore = create<CompassStore>()(
  persist(
    (set, get) => ({
      patients: seedPatients,

      getPatient: (patientId) => {
        return get().patients.find(
          (patient) => patient.id === patientId,
        );
      },

      submitCheckIn: (patientId, input) => {
        const now = new Date().toISOString();

        set((state) => ({
          patients: state.patients.map((patient) => {
            if (patient.id !== patientId) {
              return patient;
            }

            const checkIn: CheckIn = {
              id: createId("checkin"),
              createdAt: now,
              ...input,
            };

            const careGaps = [...patient.careGaps];

            const hasOpenTransportGap = careGaps.some(
              (gap) =>
                gap.type === "transportation" &&
                gap.status !== "resolved",
            );

            if (
              input.transportStatus !== "confirmed" &&
              !hasOpenTransportGap
            ) {
              careGaps.push({
                id: createId("transport-gap"),
                type: "transportation",
                title: "Transportation unresolved",
                description:
                  "Transportation is not confirmed for the upcoming treatment.",
                status: "open",
                createdAt: now,
              });
            }

            const hasOpenSymptomGap = careGaps.some(
              (gap) =>
                gap.type === "symptom" &&
                gap.status !== "resolved",
            );

            if (
              input.nausea === "severe" &&
              !hasOpenSymptomGap
            ) {
              careGaps.push({
                id: createId("symptom-gap"),
                type: "symptom",
                title: "Severe nausea reported",
                description:
                  "Severe nausea was reported during today's patient check-in.",
                status: "open",
                createdAt: now,
              });
            }

            const hasOpenMedicationGap = careGaps.some(
              (gap) =>
                gap.type === "medication" &&
                gap.status !== "resolved",
            );

            if (
              input.medicationStatus === "having_trouble" &&
              !hasOpenMedicationGap
            ) {
              careGaps.push({
                id: createId("medication-gap"),
                type: "medication",
                title: "Medication concern",
                description:
                  "The patient reported difficulty taking or accessing medication.",
                status: "open",
                createdAt: now,
              });
            }

            return {
              ...patient,
              checkIns: [
                checkIn,
                ...patient.checkIns,
              ],
              careGaps,
            };
          }),
        }));
      },

      resolveGap: (
        patientId,
        gapId,
        resolvedBy = "James Wilson",
      ) => {
        const now = new Date().toISOString();

        set((state) => ({
          patients: state.patients.map((patient) => {
            if (patient.id !== patientId) {
              return patient;
            }

            const gapToResolve = patient.careGaps.find(
              (gap) => gap.id === gapId,
            );

            const careGaps: CareGap[] =
              patient.careGaps.map((gap) => {
                if (gap.id !== gapId) {
                  return gap;
                }

                return {
                  ...gap,
                  status: "resolved",
                  resolvedAt: now,
                  resolvedBy,
                };
              });

            let checkIns = patient.checkIns;

            if (
              gapToResolve?.type === "transportation" &&
              checkIns.length > 0
            ) {
              checkIns = checkIns.map((checkIn, index) => {
                if (index !== 0) {
                  return checkIn;
                }

                return {
                  ...checkIn,
                  transportStatus: "confirmed",
                };
              });
            }

            return {
              ...patient,
              careGaps,
              checkIns,
            };
          }),
        }));
      },

      resetDemo: () => {
        set({
          patients: seedPatients,
        });
      },
    }),
    {
      name: "project-compass-demo",
    },
  ),
);