"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CallTranscript } from "@/components/calls/CallTranscript";
import {
  TOPIC_LABELS,
  describeCall,
  formatClock,
  toneClasses,
} from "@/components/calls/call-format";
import { getCall } from "@/lib/reminder-call-api";

import type { ReminderCallDetail } from "@/types/reminder-call";

export function CallRecordDialog({
  callId,
  patientName,
  onClose,
}: {
  callId: string;
  patientName: string;
  onClose: () => void;
}) {
  const [call, setCall] = useState<ReminderCallDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCall(callId)
      .then(setCall)
      .catch(() => setError("This call record could not be loaded."));
  }, [callId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = call ? describeCall(call) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-[14px] bg-white sm:rounded-[14px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="record-title" className="text-lg font-bold text-ink">
              Reminder call with {patientName}
            </h2>
            {call && (
              <p className="text-sm text-ink-soft">
                {call.channel === "phone" ? "Phone call" : "Practice call"}
                {call.mode === "agent" ? " by the AI agent" : " with fixed questions"}
                {call.phone_number && ` to ${call.phone_number}`},{" "}
                {formatClock(call.started_at ?? call.created_at)}
                {call.attempt_number > 1 && `, try ${call.attempt_number}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!call && !error && (
            <p className="flex items-center gap-2 text-ink-soft">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}

          {error && <p className="text-priority-high">{error}</p>}

          {call && status && (
            <>
              <span
                className={`inline-block rounded-md px-2.5 py-1 text-sm font-semibold ${toneClasses[status.tone]}`}
              >
                {status.label}
              </span>

              {call.summary && (
                <p className="mt-3 text-[1.05rem] leading-7 text-ink">
                  {call.summary}
                </p>
              )}

              {call.callback_topic && (
                <div className="mt-4 rounded-[10px] border border-border p-4">
                  <p className="font-semibold text-ink">
                    Wants a person to help with{" "}
                    {TOPIC_LABELS[call.callback_topic] ?? "a question"}
                    {call.callback_urgency && `, ${call.callback_urgency}`}
                  </p>
                  {call.callback_reason && (
                    <p className="mt-1 text-ink-soft">{call.callback_reason}</p>
                  )}
                  <p className="mt-1 text-sm text-ink-soft">
                    {call.transfer_status === "connected" &&
                      "The caller was put through to their navigator."}
                    {call.transfer_status === "no_answer" &&
                      "Their navigator did not answer the transfer. A call-back need was added to the patient's record."}
                    {call.transfer_status === "dialing" && "Connecting to their navigator now."}
                    {call.transfer_status === "simulated" &&
                      "On a phone call this would have been put through to their navigator. A call-back need was added."}
                    {!call.transfer_status &&
                      "A call-back need with a due time was added to the patient's record."}
                  </p>
                </div>
              )}

              {call.used_fallback && (
                <div className="mt-3 rounded-[10px] bg-priority-medium-tint p-3 text-sm text-ink">
                  <p>
                    The AI agent had a problem during this call, so the rest of
                    the call used the fixed questions.
                  </p>
                  {call.fallback_reason && (
                    <p className="mt-1 break-words font-semibold">
                      Error: {call.fallback_reason}
                    </p>
                  )}
                </div>
              )}

              {call.error_message && (
                <p className="mt-2 text-sm text-priority-high">
                  {call.error_message}
                </p>
              )}

              <h3 className="mt-6 border-t border-border pt-5 font-semibold text-ink">
                What was said
              </h3>
              <div className="mt-3">
                <CallTranscript
                  entries={call.transcript}
                  patientName={patientName}
                  answeredBy={call.answered_by}
                />
              </div>

              <p className="mt-6 text-sm text-ink-soft">
                Compass reads the answers but does not decide priority. The
                answers were saved as a check-in, and the navigation rules
                updated attention status from there.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
