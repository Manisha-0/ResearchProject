"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { caregivers as seedCaregivers, seedPatients } from "@/lib/data";

import type { CareGap, Caregiver, CheckIn, Patient } from "@/lib/types";

type SubmitCheckInInput = {
  nausea: CheckIn["nausea"];
  transportStatus: CheckIn["transportStatus"];
  medicationStatus: CheckIn["medicationStatus"];
  note: string;
  submittedBy?: CheckIn["submittedBy"];
};

type CompassStore = {
  patients: Patient[];
  caregivers: Caregiver[];
  getPatient: (patientId: string) => Patient | undefined;
  getCaregiver: (caregiverId: string) => Caregiver | undefined;
  getCaregiversForPatient: (patientId: string) => Caregiver[];
  submitCheckIn: (patientId: string, input: SubmitCheckInInput) => void;
  resolveGap: (patientId: string, gapId: string, resolvedBy?: string) => void;
  resetDemo: () => void;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitialPatients(): Patient[] {
  return structuredClone(seedPatients);
}

function getInitialCaregivers(): Caregiver[] {
  return structuredClone(seedCaregivers);
}

export const useCompassStore = create<CompassStore>()(
  persist(
    (set, get) => ({
      patients: getInitialPatients(),

      caregivers: getInitialCaregivers(),

      getPatient: (patientId) => {
        return get().patients.find((patient) => patient.id === patientId);
      },

      getCaregiver: (caregiverId) => {
        return get().caregivers.find(
          (caregiver) => caregiver.id === caregiverId,
        );
      },

      getCaregiversForPatient: (patientId) => {
        return get().caregivers.filter(
          (caregiver) =>
            caregiver.patientId === patientId && caregiver.status === "active",
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
              nausea: input.nausea,
              transportStatus: input.transportStatus,
              medicationStatus: input.medicationStatus,
              note: input.note,
              submittedBy: input.submittedBy ?? {
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
                role: "patient",
              },
            };

            let careGaps = [...patient.careGaps];

            const openTransportGap = careGaps.find(
              (gap) =>
                gap.type === "transportation" && gap.status !== "resolved",
            );

            if (input.transportStatus !== "confirmed") {
              if (!openTransportGap) {
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
            }

            if (input.transportStatus === "confirmed" && openTransportGap) {
              careGaps = careGaps.map((gap) => {
                if (gap.id !== openTransportGap.id) {
                  return gap;
                }

                return {
                  ...gap,
                  status: "resolved",
                  resolvedAt: now,
                  resolvedBy: checkIn.submittedBy.name,
                };
              });
            }

            const openSymptomGap = careGaps.find(
              (gap) => gap.type === "symptom" && gap.status !== "resolved",
            );

            if (input.nausea === "severe" && !openSymptomGap) {
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

            const openMedicationGap = careGaps.find(
              (gap) => gap.type === "medication" && gap.status !== "resolved",
            );

            if (
              input.medicationStatus === "having_trouble" &&
              !openMedicationGap
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
              checkIns: [checkIn, ...patient.checkIns],

              careGaps,
            };
          }),
        }));
      },

      resolveGap: (
        patientId,
        gapId,
        resolvedBy = "James Wilson · Navigator",
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

            if (!gapToResolve) {
              return patient;
            }

            const careGaps: CareGap[] = patient.careGaps.map((gap) => {
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

            let checkIns = [...patient.checkIns];

            if (gapToResolve.type === "transportation" && checkIns.length > 0) {
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

            const baselineTransportStatus =
              gapToResolve.type === "transportation" && checkIns.length === 0
                ? "confirmed"
                : patient.baselineTransportStatus;

            return {
              ...patient,
              baselineTransportStatus,
              careGaps,
              checkIns,
            };
          }),
        }));
      },

      resetDemo: () => {
        set({
          patients: getInitialPatients(),
          caregivers: getInitialCaregivers(),
        });
      },
    }),

    {
      name: "project-compass-demo",
      partialize: (state) => ({
        patients: state.patients,
        caregivers: state.caregivers,
      }),
    },
  ),
);
