export type ReminderCallChannel = "phone" | "simulated";

export type ReminderCallMode = "scripted" | "agent";

export type TransferStatus = "dialing" | "connected" | "no_answer" | "simulated";

export type ReminderCallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "completed"
  | "ended_early"
  | "no_answer"
  | "failed";

export type ReminderCallAnsweredBy =
  | "patient"
  | "caregiver"
  | "wrong_person"
  | "unknown";

export type TranscriptEntry = {
  speaker: "agent" | "caller";
  text: string;
  step: string | null;
  at: string | null;
};

export type ReminderCallSummary = {
  id: string;
  patient_id: string;
  appointment_id: string;
  channel: ReminderCallChannel;
  status: ReminderCallStatus;
  answered_by: ReminderCallAnsweredBy | null;
  attempt_number: number;
  summary: string | null;
  needs_follow_up: boolean;
  safety_flag: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  mode: ReminderCallMode;
  transfer_status: TransferStatus | null;
  callback_topic: string | null;
  callback_urgency: "urgent" | "today" | "routine" | null;
  callback_reason: string | null;
};

export type ReminderCallDetail = ReminderCallSummary & {
  phone_number: string | null;
  transcript: TranscriptEntry[];
  answers: Record<string, unknown>;
  check_in_id: string | null;
  error_message: string | null;
  used_fallback: boolean;
  fallback_reason: string | null;
};

export type UpcomingCallItem = {
  appointment_id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_phone: string | null;
  preferred_language: string;
  appointment_label: string;
  provider_name: string | null;
  location_name: string | null;
  scheduled_start: string;
  attempts: number;
  reached: boolean;
  due: boolean;
  latest_call: ReminderCallSummary | null;
};

export type UpcomingCallsResponse = {
  phone_calls_enabled: boolean;
  auto_dial_enabled: boolean;
  agent_available: boolean;
  default_mode: ReminderCallMode;
  window_hours: number;
  items: UpcomingCallItem[];
};

export type ReminderCallTurn = {
  call: ReminderCallDetail;
  say: string;
  done: boolean;
  expects: "yes_no" | "identity" | "number" | "free_text" | "agent" | "none";
};
