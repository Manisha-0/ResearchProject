import { authenticatedApiRequest } from "@/lib/api";

import type {
  ReminderCallChannel,
  ReminderCallDetail,
  ReminderCallSummary,
  ReminderCallTurn,
  UpcomingCallsResponse,
} from "@/types/reminder-call";

export function getUpcomingCalls() {
  return authenticatedApiRequest<UpcomingCallsResponse>(
    "/reminder-calls/upcoming",
  );
}

export function getPatientCalls(patientId: string) {
  return authenticatedApiRequest<ReminderCallSummary[]>(
    `/reminder-calls/patients/${patientId}`,
  );
}

export function getCall(callId: string) {
  return authenticatedApiRequest<ReminderCallDetail>(
    `/reminder-calls/${callId}`,
  );
}

export function startCall(
  appointmentId: string,
  channel: ReminderCallChannel,
) {
  return authenticatedApiRequest<ReminderCallTurn>("/reminder-calls", {
    method: "POST",
    body: JSON.stringify({ appointment_id: appointmentId, channel }),
  });
}

export function replyToCall(
  callId: string,
  text: string,
  digits?: string,
) {
  return authenticatedApiRequest<ReminderCallTurn>(
    `/reminder-calls/${callId}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ text, digits: digits ?? null }),
    },
  );
}

export function endCall(callId: string) {
  return authenticatedApiRequest<ReminderCallDetail>(
    `/reminder-calls/${callId}/end`,
    { method: "POST" },
  );
}
