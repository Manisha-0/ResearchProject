import type {
  Caregiver,
  Patient,
} from "@/lib/types";

export const maria: Patient = {
  id: "maria-johnson",
  firstName: "Maria",
  lastName: "Johnson",
  initials: "MJ",
  age: 61,
  cancerType: "Breast cancer",
  stage: "Stage II",
  nextTreatment: {
    label: "Chemotherapy",
    date: "Tomorrow",
    time: "10:30 AM",
    within48Hours: true,
  },
  authorizationPending: true,
  baselineTransportStatus: "confirmed",
  checkIns: [],
  careGaps: [
    {
      id: "maria-auth",
      type: "authorization",
      title: "Authorization pending",
      description:
        "Treatment authorization has not yet been confirmed for tomorrow's cycle.",
      status: "open",
      createdAt: "2026-08-25T08:00:00",
    },
  ],
};

export const jamesCarter: Patient = {
  id: "james-carter",
  firstName: "James",
  lastName: "Carter",
  initials: "JC",
  age: 68,
  cancerType: "Colorectal cancer",
  stage: "Stage II",
  nextTreatment: {
    label: "Infusion",
    date: "Tomorrow",
    time: "2:00 PM",
    within48Hours: true,
  },
  authorizationPending: true,
  baselineTransportStatus: "not_sure",
  checkIns: [
    {
      id: "james-checkin-1",
      createdAt: "2026-08-25T07:30:00",
      nausea: "mild",
      transportStatus: "not_sure",
      medicationStatus: "on_track",
      note: "",
      submittedBy: {
        id: "james-carter",
        name: "James Carter",
        role: "patient",
      },
    },
  ],

  careGaps: [
    {
      id: "james-auth",
      type: "authorization",
      title: "Authorization expiring",
      description:
        "Prior authorization may expire before the next treatment.",
      status: "open",
      createdAt: "2026-08-25T07:30:00",
    },

    {
      id: "james-transport",
      type: "transportation",
      title: "Transportation not confirmed",
      description:
        "Transportation has not been confirmed for tomorrow's appointment.",
      status: "open",
      createdAt: "2026-08-25T07:30:00",
    },
  ],
};

export const lindaOchoa: Patient = {
  id: "linda-ochoa",
  firstName: "Linda",
  lastName: "Ochoa",
  initials: "LO",
  age: 57,
  cancerType: "Lung cancer",
  stage: "Cycle 5",
  nextTreatment: {
    label: "Treatment follow-up",
    date: "Friday",
    time: "9:15 AM",
    within48Hours: false,
  },
  authorizationPending: false,
  baselineTransportStatus: "confirmed",
  checkIns: [
    {
      id: "linda-checkin-1",
      createdAt: "2026-08-25T08:10:00",
      nausea: "moderate",
      transportStatus: "confirmed",
      medicationStatus: "having_trouble",
      note:
        "I am not sure whether my refill will be ready this week.",
      submittedBy: {
        id: "linda-ochoa",
        name: "Linda Ochoa",
        role: "patient",
      },
    },
  ],

  careGaps: [
    {
      id: "linda-medication",
      type: "medication",
      title: "Medication access concern",
      description:
        "The patient reported difficulty confirming a medication refill.",
      status: "open",
      createdAt: "2026-08-25T08:10:00",
    },
  ],
};

export const robertGuillory: Patient = {
  id: "robert-guillory",
  firstName: "Robert",
  lastName: "Guillory",
  initials: "RG",
  age: 72,
  cancerType: "Prostate cancer",
  stage: "Surveillance",
  nextTreatment: {
    label: "Follow-up visit",
    date: "September 14",
    time: "11:00 AM",
    within48Hours: false,
  },
  authorizationPending: false,
  baselineTransportStatus: "confirmed",
  checkIns: [
    {
      id: "robert-checkin-1",
      createdAt: "2026-08-25T06:50:00",
      nausea: "none",
      transportStatus: "confirmed",
      medicationStatus: "on_track",
      note: "",
      submittedBy: {
        id: "robert-guillory",
        name: "Robert Guillory",
        role: "patient",
      },
    },
  ],

  careGaps: [],
};

export const seedPatients: Patient[] = [
  maria,
  jamesCarter,
  lindaOchoa,
  robertGuillory,
];

export const caregivers: Caregiver[] = [
  {
    id: "danielle-johnson",
    patientId: "maria-johnson",
    firstName: "Danielle",
    lastName: "Johnson",
    relationship: "Daughter",
    status: "active",

    permissions: [
      "appointments",
      "transportation",
      "care_tasks",
      "proxy_check_in",
    ],
  },
];