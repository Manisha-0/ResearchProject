import type {
  ReminderCallSummary,
  UpcomingCallItem,
} from "@/types/reminder-call";

export type CallTone = "urgent" | "attention" | "done" | "waiting" | "none";

export function describeCall(call: ReminderCallSummary | null): {
  label: string;
  tone: CallTone;
} {
  if (!call) return { label: "Not called yet", tone: "none" };

  if (call.safety_flag) return { label: "Urgent: call back now", tone: "urgent" };

  switch (call.status) {
    case "queued":
    case "ringing":
      return { label: "Ringing", tone: "waiting" };
    case "in_progress":
      return { label: "On the call", tone: "waiting" };
    case "no_answer":
      return { label: "No answer", tone: "attention" };
    case "failed":
      return { label: "Call failed", tone: "attention" };
  }

  if (call.answered_by === "wrong_person")
    return { label: "Wrong person answered", tone: "attention" };
  if (call.answered_by === "unknown")
    return { label: "Could not confirm who answered", tone: "attention" };

  const who = call.answered_by === "caregiver" ? "caregiver" : "patient";

  if (call.transfer_status === "dialing")
    return { label: "Connecting to navigator", tone: "waiting" };
  if (call.transfer_status === "connected")
    return { label: `Put through to navigator`, tone: "done" };
  if (call.transfer_status === "no_answer")
    return { label: "Navigator missed it, call back due", tone: "attention" };
  if (call.callback_urgency === "urgent" || call.callback_urgency === "today")
    return { label: `Reached ${who}, call back today`, tone: "attention" };

  if (call.needs_follow_up)
    return { label: `Reached ${who}, needs follow-up`, tone: "attention" };

  if (call.status === "ended_early")
    return { label: `Reached ${who}, call cut short`, tone: "attention" };

  return { label: `Reached ${who}, all set`, tone: "done" };
}

export const toneClasses: Record<CallTone, string> = {
  urgent: "bg-priority-high text-white",
  attention: "bg-priority-medium-tint text-priority-medium",
  done: "bg-priority-low-tint text-priority-low",
  waiting: "bg-pine-tint text-pine",
  none: "bg-surface-soft text-ink-soft",
};

/** Calls a person should look at first come first. */
export function sortForNavigator(items: UpcomingCallItem[]) {
  const rank = (item: UpcomingCallItem) => {
    const tone = describeCall(item.latest_call).tone;
    return { urgent: 0, attention: 1, waiting: 2, none: 3, done: 4 }[tone];
  };

  return [...items].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime(),
  );
}

export function formatVisitTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const dayStart = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(date) - dayStart(now)) / 86_400_000);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatClock(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const TOPIC_LABELS: Record<string, string> = {
  symptoms: "symptoms",
  medicine: "medicines",
  ride: "a ride",
  cost_insurance: "cost or insurance",
  appointment: "the appointment",
  other: "a question",
};
