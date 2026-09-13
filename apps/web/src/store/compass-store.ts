"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  caregivers as seedCaregivers,
  seedPatients,
} from "@/lib/data";

import { createPatientFriendlyDocumentSummary } from "@/lib/admin-ai";

import type {
  Appointment,
  CareGap,
  Caregiver,
  CheckIn,
  DocumentCategory,
  JourneyStatus,
  Patient,
  PatientDocument,
} from "@/lib/types";

type SubmitCheckInInput = {
  nausea: CheckIn["nausea"];

  transportStatus: CheckIn["transportStatus"];

  medicationStatus: CheckIn["medicationStatus"];

  note: string;

  submittedBy?: CheckIn["submittedBy"];
};

type AddAppointmentInput = {
  title: string;

  date: string;

  time: string;

  location: string;

  within48Hours?: boolean;
};

type AddDocumentInput = {
  title: string;

  category: DocumentCategory;

  fileName: string;

  sourceText: string;
};

type CompassStore = {
  patients: Patient[];

  caregivers: Caregiver[];

  getPatient: (
    patientId: string
  ) => Patient | undefined;

  getCaregiver: (
    caregiverId: string
  ) => Caregiver | undefined;

  getCaregiversForPatient: (
    patientId: string
  ) => Caregiver[];

  submitCheckIn: (
    patientId: string,
    input: SubmitCheckInInput
  ) => void;

  resolveGap: (
    patientId: string,
    gapId: string,
    resolvedBy?: string
  ) => void;

  addAppointment: (
    patientId: string,
    input: AddAppointmentInput
  ) => void;

  addDocument: (
    patientId: string,
    input: AddDocumentInput
  ) => void;

  updateJourneyStatus: (
    patientId: string,
    journeyItemId: string,
    status: JourneyStatus
  ) => void;

  resetDemo: () => void;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getInitialPatients() {
  return structuredClone(seedPatients);
}

function getInitialCaregivers() {
  return structuredClone(seedCaregivers);
}

export const useCompassStore =
  create<CompassStore>()(
    persist(
      (set, get) => ({
        patients: getInitialPatients(),

        caregivers: getInitialCaregivers(),

        getPatient: (
          patientId
        ) => {
          return get().patients.find(
            (patient) =>
              patient.id === patientId
          );
        },

        getCaregiver: (
          caregiverId
        ) => {
          return get().caregivers.find(
            (caregiver) =>
              caregiver.id === caregiverId
          );
        },

        getCaregiversForPatient: (
          patientId
        ) => {
          return get().caregivers.filter(
            (caregiver) =>
              caregiver.patientId ===
                patientId &&
              caregiver.status ===
                "active"
          );
        },

        submitCheckIn: (
          patientId,
          input
        ) => {
          const now =
            new Date().toISOString();

          set((state) => ({
            patients:
              state.patients.map(
                (patient) => {
                  if (
                    patient.id !==
                    patientId
                  ) {
                    return patient;
                  }

                  const checkIn: CheckIn =
                    {
                      id: createId(
                        "checkin"
                      ),

                      createdAt: now,

                      nausea:
                        input.nausea,

                      transportStatus:
                        input.transportStatus,

                      medicationStatus:
                        input.medicationStatus,

                      note: input.note,

                      submittedBy:
                        input.submittedBy ??
                        {
                          id: patient.id,

                          name: `${patient.firstName} ${patient.lastName}`,

                          role: "patient",
                        },
                    };

                  let careGaps = [
                    ...patient.careGaps,
                  ];

                  const openTransportGap =
                    careGaps.find(
                      (gap) =>
                        gap.type ===
                          "transportation" &&
                        gap.status !==
                          "resolved"
                    );

                  if (
                    input.transportStatus !==
                      "confirmed" &&
                    !openTransportGap
                  ) {
                    careGaps.push({
                      id: createId(
                        "transport-gap"
                      ),

                      type: "transportation",

                      title:
                        "Transportation unresolved",

                      description:
                        "Transportation is not confirmed for the upcoming treatment.",

                      status: "open",

                      createdAt: now,
                    });
                  }

                  if (
                    input.transportStatus ===
                      "confirmed" &&
                    openTransportGap
                  ) {
                    careGaps =
                      careGaps.map(
                        (gap) =>
                          gap.id ===
                          openTransportGap.id
                            ? {
                                ...gap,

                                status:
                                  "resolved",

                                resolvedAt:
                                  now,

                                resolvedBy:
                                  checkIn
                                    .submittedBy
                                    .name,
                              }
                            : gap
                      );
                  }

                  const openSymptomGap =
                    careGaps.find(
                      (gap) =>
                        gap.type ===
                          "symptom" &&
                        gap.status !==
                          "resolved"
                    );

                  if (
                    input.nausea ===
                      "severe" &&
                    !openSymptomGap
                  ) {
                    careGaps.push({
                      id: createId(
                        "symptom-gap"
                      ),

                      type: "symptom",

                      title:
                        "Severe nausea reported",

                      description:
                        "Severe nausea was reported during today's patient check-in.",

                      status: "open",

                      createdAt: now,
                    });
                  }

                  const openMedicationGap =
                    careGaps.find(
                      (gap) =>
                        gap.type ===
                          "medication" &&
                        gap.status !==
                          "resolved"
                    );

                  if (
                    input.medicationStatus ===
                      "having_trouble" &&
                    !openMedicationGap
                  ) {
                    careGaps.push({
                      id: createId(
                        "medication-gap"
                      ),

                      type: "medication",

                      title:
                        "Medication concern",

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
                }
              ),
          }));
        },

        resolveGap: (
          patientId,
          gapId,
          resolvedBy =
            "Navigator"
        ) => {
          const now =
            new Date().toISOString();

          set((state) => ({
            patients:
              state.patients.map(
                (patient) => {
                  if (
                    patient.id !==
                    patientId
                  ) {
                    return patient;
                  }

                  const gapToResolve =
                    patient.careGaps.find(
                      (gap) =>
                        gap.id === gapId
                    );

                  if (!gapToResolve) {
                    return patient;
                  }

                  const careGaps:
                    CareGap[] =
                      patient.careGaps.map(
                        (gap) =>
                          gap.id === gapId
                            ? {
                                ...gap,

                                status:
                                  "resolved",

                                resolvedAt:
                                  now,

                                resolvedBy,
                              }
                            : gap
                      );

                  let checkIns = [
                    ...patient.checkIns,
                  ];

                  if (
                    gapToResolve.type ===
                      "transportation" &&
                    checkIns.length > 0
                  ) {
                    checkIns =
                      checkIns.map(
                        (
                          checkIn,
                          index
                        ) =>
                          index === 0
                            ? {
                                ...checkIn,

                                transportStatus:
                                  "confirmed",
                              }
                            : checkIn
                      );
                  }

                  return {
                    ...patient,

                    careGaps,

                    checkIns,
                  };
                }
              ),
          }));
        },

        addAppointment: (
          patientId,
          input
        ) => {
          const now =
            new Date().toISOString();

          const appointmentId =
            createId(
              "appointment"
            );

          set((state) => ({
            patients:
              state.patients.map(
                (patient) => {
                  if (
                    patient.id !==
                    patientId
                  ) {
                    return patient;
                  }

                  const appointment:
                    Appointment = {
                      id: appointmentId,

                      patientId,

                      title:
                        input.title,

                      date:
                        input.date,

                      time:
                        input.time,

                      location:
                        input.location,

                      status:
                        "scheduled",

                      createdAt: now,

                      createdBy:
                        "Navigator",
                    };

                  return {
                    ...patient,

                    nextTreatment:
                      input.within48Hours
                        ? {
                            label:
                              input.title,

                            date:
                              input.date,

                            time:
                              input.time,

                            within48Hours:
                              true,
                          }
                        : patient.nextTreatment,

                    appointments: [
                      appointment,
                      ...patient.appointments,
                    ],

                    journey: [
                      ...patient.journey,

                      {
                        id: createId(
                          "journey"
                        ),

                        patientId,

                        type:
                          "appointment",

                        title:
                          input.title,

                        detail: `${input.time} · ${input.location}`,

                        date:
                          input.date,

                        status:
                          "upcoming",

                        updatedBy:
                          "Navigator",
                      },
                    ],
                  };
                }
              ),
          }));
        },

        addDocument: (
          patientId,
          input
        ) => {
          const now =
            new Date().toISOString();

          set((state) => ({
            patients:
              state.patients.map(
                (patient) => {
                  if (
                    patient.id !==
                    patientId
                  ) {
                    return patient;
                  }

                  const uploadedBy =
                    "Navigator";

                  const document:
                    PatientDocument = {
                      id: createId(
                        "document"
                      ),

                      patientId,

                      title:
                        input.title,

                      category:
                        input.category,

                      fileName:
                        input.fileName,

                      uploadedAt: now,

                      uploadedBy,

                      sourceText:
                        input.sourceText,

                      patientFriendlySummary:
                        createPatientFriendlyDocumentSummary(
                          input.title,
                          input.sourceText
                        ),
                    };

                  return {
                    ...patient,

                    documents: [
                      document,
                      ...patient.documents,
                    ],
                  };
                }
              ),
          }));
        },

        updateJourneyStatus: (
          patientId,
          journeyItemId,
          status
        ) => {
          set((state) => ({
            patients:
              state.patients.map(
                (patient) => {
                  if (
                    patient.id !==
                    patientId
                  ) {
                    return patient;
                  }

                  return {
                    ...patient,

                    journey:
                      patient.journey.map(
                        (item) =>
                          item.id ===
                          journeyItemId
                            ? {
                                ...item,

                                status,

                                updatedBy:
                                  "Navigator",
                              }
                            : item
                      ),
                  };
                }
              ),
          }));
        },

        resetDemo: () => {
          set({
            patients:
              getInitialPatients(),

            caregivers:
              getInitialCaregivers(),
          });
        },
      }),

      {
        name: "project-compass-demo-v4",

        partialize: (
          state
        ) => ({
          patients:
            state.patients,

          caregivers:
            state.caregivers,
        }),
      }
    )
  );