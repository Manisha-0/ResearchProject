import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  AppointmentCreateRequest,
  CaregiverConsent,
  CaregiverInviteRequest,
  CaregiverInviteResponse,
  AppointmentCreateResponse,
  JourneyItemCreateRequest,
  JourneyItemResponse,
  JourneyTimelineItem,
  NavigationTaskCreateRequest,
  NavigationTaskResponse,
  NavigationTaskUpdateRequest,
  NavigatorDashboardResponse,
  NavigatorTaskQueueItem,
  Patient360Response,
  PatientCreateRequest,
  PatientCreateResponse,
} from "@/types/navigator";


export async function getNavigatorDashboard():
Promise<NavigatorDashboardResponse> {
  return authenticatedApiRequest<
    NavigatorDashboardResponse
  >(
    "/navigator/dashboard",
    {
      method: "GET",
    },
  );
}


export async function getPatient360(
  patientId: string,
): Promise<Patient360Response> {
  return authenticatedApiRequest<
    Patient360Response
  >(
    `/patients/${patientId}/360`,
    {
      method: "GET",
    },
  );
}


export async function createPatient(
  payload: PatientCreateRequest,
): Promise<PatientCreateResponse> {
  return authenticatedApiRequest<
    PatientCreateResponse
  >(
    "/patients",
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function createPatientAppointment(
  patientId: string,
  payload: AppointmentCreateRequest,
): Promise<AppointmentCreateResponse> {
  return authenticatedApiRequest<
    AppointmentCreateResponse
  >(
    `/patients/${patientId}/appointments`,
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function getPatientJourney(
  patientId: string,
): Promise<JourneyTimelineItem[]> {
  return authenticatedApiRequest<
    JourneyTimelineItem[]
  >(
    `/patients/${patientId}/journey`,
    {
      method: "GET",
    },
  );
}


export async function createJourneyItem(
  patientId: string,
  payload: JourneyItemCreateRequest,
): Promise<JourneyItemResponse> {
  return authenticatedApiRequest<
    JourneyItemResponse
  >(
    `/patients/${patientId}/journey`,
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function resolveNavigationNeed(
  patientId: string,
  needId: string,
): Promise<void> {
  await authenticatedApiRequest(
    `/patients/${patientId}/attention/needs/${needId}/resolve`,
    {
      method: "PATCH",
    },
  );
}


export async function createNavigationTask(
  patientId: string,
  needId: string,
  payload: NavigationTaskCreateRequest = {},
): Promise<NavigationTaskResponse> {
  return authenticatedApiRequest<
    NavigationTaskResponse
  >(
    `/patients/${patientId}/needs/${needId}/tasks`,
    {
      method: "POST",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function updateNavigationTask(
  patientId: string,
  taskId: string,
  payload: NavigationTaskUpdateRequest,
): Promise<NavigationTaskResponse> {
  return authenticatedApiRequest<
    NavigationTaskResponse
  >(
    `/patients/${patientId}/tasks/${taskId}`,
    {
      method: "PATCH",

      body: JSON.stringify(
        payload,
      ),
    },
  );
}


/* Tick or untick one item on a follow-up checklist. */
export async function updateTaskItem(
  patientId: string,
  taskId: string,
  itemId: string,
  done: boolean,
): Promise<NavigationTaskResponse> {
  return authenticatedApiRequest<NavigationTaskResponse>(
    `/patients/${patientId}/tasks/${taskId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ done }),
    },
  );
}


export async function getNavigatorTasks():
Promise<NavigatorTaskQueueItem[]> {
  return authenticatedApiRequest<
    NavigatorTaskQueueItem[]
  >(
    "/navigator/tasks",
    {
      method: "GET",
    },
  );
}

/* Invite a caregiver for a patient. With `consent`, the
   navigator records that the patient agreed (by phone, in
   person or on paper) and access is approved straight away. */
export async function inviteCaregiver(
  patientId: string,
  payload: CaregiverInviteRequest,
): Promise<CaregiverInviteResponse> {
  return authenticatedApiRequest<CaregiverInviteResponse>(
    `/patients/${patientId}/caregivers`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


/* Approve a waiting caregiver request with consent the
   patient gave outside the app. */
export async function recordCaregiverConsent(
  patientId: string,
  caregiverAccessId: string,
  consent: CaregiverConsent,
): Promise<CaregiverInviteResponse> {
  return authenticatedApiRequest<CaregiverInviteResponse>(
    `/patients/${patientId}/caregivers/${caregiverAccessId}/consent`,
    {
      method: "POST",
      body: JSON.stringify(consent),
    },
  );
}
