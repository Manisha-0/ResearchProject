"use client";

import { PhoneCall } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CallRecordDialog } from "@/components/calls/CallRecordDialog";
import {
  describeCall,
  formatClock,
  toneClasses,
} from "@/components/calls/call-format";
import { getPatientCalls } from "@/lib/reminder-call-api";

import type { ReminderCallSummary } from "@/types/reminder-call";

export function PatientCallHistory({
  patientId,
  patientFirstName,
}: {
  patientId: string;
  patientFirstName: string;
}) {
  const [calls, setCalls] = useState<ReminderCallSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPatientCalls(patientId)
      .then((rows) => !cancelled && setCalls(rows))
      .catch(() => !cancelled && setCalls([]));
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return (
    <section className="rounded-[14px] border border-border bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ink">Reminder calls</h2>
          <p className="text-sm text-ink-soft">
            Automated calls before each visit, with what was said.
          </p>
        </div>
        <Link
          href="/navigator/calls"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-pine hover:underline"
        >
          <PhoneCall className="h-4 w-4" /> All calls
        </Link>
      </div>

      {calls === null && <p className="mt-4 text-sm text-ink-soft">Loading…</p>}

      {calls?.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          No reminder calls yet. {patientFirstName} will be called when a visit
          is within 48 hours.
        </p>
      )}

      {calls && calls.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {calls.slice(0, 5).map((call) => {
            const status = describeCall(call);
            return (
              <li key={call.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(call.id)}
                  className="w-full py-3 text-left hover:bg-surface-soft/60"
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${toneClasses[status.tone]}`}>
                      {status.label}
                    </span>
                    <span className="text-sm text-ink-soft">
                      {formatClock(call.started_at ?? call.created_at)},{" "}
                      {call.channel === "phone" ? "phone" : "practice"}
                      {call.mode === "agent" ? ", AI agent" : ""}
                    </span>
                  </span>
                  {call.summary && (
                    <span className="mt-1 line-clamp-2 block text-sm text-ink">
                      {call.summary}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openId && (
        <CallRecordDialog
          callId={openId}
          patientName={patientFirstName}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
