"use client";

import { useEffect, useRef } from "react";

import type { TranscriptEntry } from "@/types/reminder-call";

export function CallTranscript({
  entries,
  patientName,
  answeredBy = null,
  live = false,
}: {
  entries: TranscriptEntry[];
  patientName: string;
  answeredBy?: string | null;
  live?: boolean;
}) {
  const callerLabel =
    answeredBy === "patient"
      ? patientName
      : answeredBy === "caregiver"
        ? "Caregiver"
        : "Caller";

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length, live]);

  if (entries.length === 0) {
    return <p className="text-ink-soft">Nothing was said on this call.</p>;
  }

  return (
    <ol className="space-y-4" aria-live={live ? "polite" : undefined}>
      {entries.map((entry, index) => {
        const agent = entry.speaker === "agent";
        const silent = entry.text.startsWith("(");

        return (
          <li
            key={`${index}-${entry.at ?? ""}`}
            className="grid grid-cols-[5.5rem_1fr] gap-3"
          >
            <span
              className={`pt-0.5 text-sm font-semibold ${agent ? "text-ink-soft" : "text-pine"}`}
            >
              {agent ? "Compass" : callerLabel}
            </span>

            <p
              className={
                silent
                  ? "italic text-ink-soft"
                  : agent
                    ? "text-ink-soft"
                    : "font-semibold text-ink"
              }
            >
              {entry.text}
            </p>
          </li>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}
