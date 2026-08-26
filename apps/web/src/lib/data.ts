import type {
  Caregiver,
  DemoAccount,
  Patient,
} from "@/lib/types";

export const manisha: Patient = {
  id: "manisha-johnson",

  firstName: "Manisha",
  lastName: "Johnson",

  initials: "MP",

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
      id: "manisha-authorization",

      type: "authorization",

      title: "Authorization pending",

      description:
        "Treatment authorization has not yet been confirmed for tomorrow's chemotherapy cycle.",

      status: "open",

      createdAt: "2026-08-25T08:00:00",
    },
  ],

  appointments: [
    {
      id: "appointment-chemo-2",

      patientId: "manisha-johnson",

      title: "Chemotherapy — Cycle 2",

      date: "August 26, 2026",

      time: "10:30 AM",

      location: "Ochsner Cancer Center",

      status: "scheduled",

      createdAt: "2026-08-20T10:00:00",

      createdBy: "James Wilson · Navigator",
    },

    {
      id: "appointment-oncology-consult",

      patientId: "manisha-johnson",

      title: "Medical Oncology Consultation",

      date: "August 12, 2026",

      time: "9:00 AM",

      location: "Ochsner Cancer Center",

      status: "completed",

      createdAt: "2026-08-05T10:00:00",

      createdBy: "James Wilson · Navigator",
    },
  ],

  documents: [
    {
      id: "document-treatment-plan",

      patientId: "manisha-johnson",

      title: "Treatment Plan",

      category: "care_plan",

      fileName:
        "manisha-treatment-plan-demo.pdf",

      uploadedAt: "2026-08-12T12:00:00",

      uploadedBy:
        "James Wilson · Navigator",

      sourceText:
        "Treatment plan includes systemic therapy beginning in August with scheduled oncology follow-up and supportive-care monitoring.",

      patientFriendlySummary:
        "Your treatment plan includes chemotherapy beginning in August, regular oncology follow-up, and supportive-care check-ins along the way.",
    },

    {
      id: "document-chemo-education",

      patientId: "manisha-johnson",

      title: "Preparing for Chemotherapy",

      category: "education",

      fileName:
        "chemotherapy-preparation-demo.pdf",

      uploadedAt: "2026-08-15T09:30:00",

      uploadedBy:
        "James Wilson · Navigator",

      sourceText:
        "Patient education materials covering appointment preparation, transportation planning, symptom reporting, and contact instructions.",

      patientFriendlySummary:
        "This guide explains how to prepare for your chemotherapy visit, plan transportation, report symptoms, and know when to contact your care team.",
    },
  ],

  journey: [
    {
      id: "journey-diagnosis",

      patientId: "manisha-johnson",

      type: "diagnosis",

      title: "Diagnosis confirmed",

      detail:
        "Breast cancer diagnosis confirmed and oncology referral completed.",

      date: "July 28, 2026",

      status: "completed",

      updatedBy:
        "James Wilson · Navigator",
    },

    {
      id: "journey-oncology-consult",

      patientId: "manisha-johnson",

      type: "consultation",

      title: "Oncology consultation",

      detail:
        "Met with the oncology team and reviewed treatment options.",

      date: "August 12, 2026",

      status: "completed",

      updatedBy:
        "James Wilson · Navigator",
    },

    {
      id: "journey-treatment-plan",

      patientId: "manisha-johnson",

      type: "treatment_plan",

      title: "Treatment plan established",

      detail:
        "Chemotherapy plan added to Compass and reviewed with the care team.",

      date: "August 12, 2026",

      status: "completed",

      updatedBy:
        "James Wilson · Navigator",
    },

    {
      id: "journey-chemo",

      patientId: "manisha-johnson",

      type: "treatment",

      title: "Chemotherapy",

      detail:
        "Currently receiving planned chemotherapy treatment.",

      date: "August 2026",

      status: "current",

      updatedBy:
        "James Wilson · Navigator",
    },

    {
      id: "journey-follow-up",

      patientId: "manisha-johnson",

      type: "appointment",

      title: "Treatment response follow-up",

      detail:
        "Follow-up visit will be scheduled after the current treatment cycle.",

      date: "Upcoming",

      status: "upcoming",

      updatedBy:
        "James Wilson · Navigator",
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

  appointments: [],

  documents: [],

  journey: [],
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

      medicationStatus:
        "having_trouble",

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

      title:
        "Medication access concern",

      description:
        "The patient reported difficulty confirming a medication refill.",

      status: "open",

      createdAt:
        "2026-08-25T08:10:00",
    },
  ],

  appointments: [],

  documents: [],

  journey: [],
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

  baselineTransportStatus:
    "confirmed",

  checkIns: [
    {
      id: "robert-checkin-1",

      createdAt:
        "2026-08-25T06:50:00",

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

  appointments: [],

  documents: [],

  journey: [],
};

export const seedPatients: Patient[] = [
  manisha,
  jamesCarter,
  lindaOchoa,
  robertGuillory,
];

export const caregivers: Caregiver[] = [
  {
    id: "danielle-johnson",

    patientId: "manisha-johnson",

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

    invitedBy:
      "James Wilson · Navigator",

    approvedByPatient: true,
  },
];

export const demoAccounts: DemoAccount[] = [
  {
    id: "manisha-johnson",

    name: "Manisha Johnson",

    email:
      "manisha@compass.demo",

    password: "demo123",

    role: "patient",

    patientId: "manisha-johnson",
  },

  {
    id: "danielle-johnson",

    name: "Danielle Johnson",

    email:
      "danielle@compass.demo",

    password: "demo123",

    role: "caregiver",

    patientId: "manisha-johnson",
  },

  {
    id: "james-wilson",

    name: "James Wilson",

    email:
      "james@compass.demo",

    password: "demo123",

    role: "navigator",
  },
];