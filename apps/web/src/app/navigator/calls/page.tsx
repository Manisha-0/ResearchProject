"use client";

import { LoaderCircle, Phone, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/app/AppHeader";
import { CallRecordDialog } from "@/components/calls/CallRecordDialog";
import { CallSimulator } from "@/components/calls/CallSimulator";
import {
  describeCall,
  formatVisitTime,
  sortForNavigator,
  toneClasses,
} from "@/components/calls/call-format";
import { ApiError } from "@/lib/api";
import { getUpcomingCalls, startCall } from "@/lib/reminder-call-api";

import type {
  UpcomingCallItem,
  UpcomingCallsResponse,
} from "@/types/reminder-call";

export default function ReminderCallsPage() {
  const [data, setData] = useState<UpcomingCallsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<UpcomingCallItem | null>(null);
  const [viewing, setViewing] = useState<UpcomingCallItem | null>(null);
  const [dialling, setDialling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getUpcomingCalls());
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Calls could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const next = await getUpcomingCalls();
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Calls could not be loaded.");
        }
      }
    }

    void refresh();
    // Phone calls change status on their own; keep the list fresh.
    const timer = window.setInterval(() => void refresh(), 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function phone(item: UpcomingCallItem) {
    setDialling(item.appointment_id);
    setNotice(null);
    try {
      await startCall(item.appointment_id, "phone");
      setNotice(`Calling ${item.patient_first_name} now.`);
      await load();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "The call could not be placed.");
    } finally {
      setDialling(null);
    }
  }

  const items = data ? sortForNavigator(data.items) : [];
  const needsPerson = items.filter((item) =>
    ["urgent", "attention"].includes(describeCall(item.latest_call).tone),
  ).length;

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-[2rem] font-bold leading-tight text-pine-deep">
          Reminder calls
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Compass phones every patient with a visit in the next{" "}
          {data?.window_hours ?? 48} hours. It reminds them of the time and
          place and asks about rides, medicines, symptoms and costs. Calls that
          need a person are listed first.
        </p>

        {data && !data.phone_calls_enabled && (
          <p className="mt-5 max-w-3xl rounded-[10px] border border-sun bg-sun-tint p-4 text-ink">
            Phone calls are off because Twilio is not set up yet. You can still
            run any call as a practice call in the browser. Setup steps are in
            the backend README.
          </p>
        )}

        {data?.phone_calls_enabled && (
          <p className="mt-5 text-sm text-ink-soft">
            {data.auto_dial_enabled
              ? "Automatic calling is on. Patients are called without anyone pressing a button, and no-answers are retried once."
              : "Automatic calling is off. Use the Call button, or turn on REMINDER_CALL_AUTO_DIAL."}
          </p>
        )}

        {notice && (
          <p role="status" className="mt-4 font-semibold text-pine">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-6 text-priority-high">
            {error}
          </p>
        )}

        {!data && !error && (
          <p className="mt-8 flex items-center gap-2 text-ink-soft">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading visits…
          </p>
        )}

        {data && items.length === 0 && (
          <div className="mt-8 border-t border-border pt-8">
            <h2 className="text-xl font-bold text-ink">
              No visits in the next {data.window_hours} hours
            </h2>
            <p className="mt-1 text-ink-soft">
              Once a visit is booked within that window it will appear here.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="mt-8 font-semibold text-ink">
              {items.length} {items.length === 1 ? "visit" : "visits"}
              {needsPerson > 0 && `, ${needsPerson} need a person`}
            </p>

            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-white">
              {items.map((item) => (
                <CallRow
                  key={item.appointment_id}
                  item={item}
                  phoneEnabled={data?.phone_calls_enabled ?? false}
                  dialling={dialling === item.appointment_id}
                  onPhone={() => void phone(item)}
                  onSimulate={() => setSimulating(item)}
                  onView={() => setViewing(item)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {simulating && (
        <CallSimulator
          item={simulating}
          onClose={(changed) => {
            setSimulating(null);
            if (changed) void load();
          }}
        />
      )}

      {viewing?.latest_call && (
        <CallRecordDialog
          callId={viewing.latest_call.id}
          patientName={viewing.patient_first_name}
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}

function CallRow({
  item,
  phoneEnabled,
  dialling,
  onPhone,
  onSimulate,
  onView,
}: {
  item: UpcomingCallItem;
  phoneEnabled: boolean;
  dialling: boolean;
  onPhone: () => void;
  onSimulate: () => void;
  onView: () => void;
}) {
  const status = describeCall(item.latest_call);
  const active = ["waiting"].includes(status.tone);

  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[9rem_1fr_15rem_auto] md:items-center">
      <p className="font-semibold text-ink">{formatVisitTime(item.scheduled_start)}</p>

      <div className="min-w-0">
        <Link
          href={`/navigator/patient/${item.patient_id}`}
          className="font-semibold text-pine underline-offset-4 hover:underline"
        >
          {item.patient_first_name} {item.patient_last_name}
        </Link>
        <p className="truncate text-sm text-ink-soft">
          {item.appointment_label}
          {item.location_name && `, ${item.location_name}`}
        </p>
        <p className="text-sm text-ink-soft">
          {item.patient_phone ?? "No phone number on file"}
          {item.preferred_language !== "English" && `, prefers ${item.preferred_language}`}
        </p>
      </div>

      <div>
        <span className={`inline-block rounded-md px-2.5 py-1 text-sm font-semibold ${toneClasses[status.tone]}`}>
          {status.label}
        </span>
        {item.attempts > 0 && !item.reached && (
          <p className="mt-1 text-sm text-ink-soft">
            {item.attempts} phone {item.attempts === 1 ? "try" : "tries"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {item.latest_call && !active && (
          <button
            type="button"
            onClick={onView}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-pine hover:bg-pine-tint"
          >
            Read call
          </button>
        )}

        <button
          type="button"
          onClick={onSimulate}
          disabled={active}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-pine-soft disabled:opacity-40"
        >
          <PhoneCall className="h-4 w-4" /> Practice call
        </button>

        {phoneEnabled && (
          <button
            type="button"
            onClick={onPhone}
            disabled={dialling || active || !item.patient_phone}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-40"
          >
            {dialling ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            Call
          </button>
        )}
      </div>
    </li>
  );
}
