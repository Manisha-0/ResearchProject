"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { computePriority } from "@/lib/scoring";
import type { Patient } from "@/lib/types";
import { PriorityBadge } from "./PriorityBadge";

type PatientRowProps = {
  patient: Patient;
};

export function PatientRow({ patient }: PatientRowProps) {
  const router = useRouter();
  const priority = computePriority(patient);

  const activeGaps = patient.careGaps.filter(
    (gap) => gap.status !== "resolved",
  );

  return (
    <button
      type="button"
      onClick={() => router.push(`/navigator/patient/${patient.id}`)}
      className="
        group
        w-full
        rounded-2xl
        border
        border-border
        bg-white
        p-5
        text-left
        transition
        hover:-translate-y-0.5
        hover:border-pine/25
        hover:shadow-md
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-pine
      "
    >
      <div className="flex items-start gap-4">
        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-pine-tint
            text-sm
            font-bold
            text-pine
          "
        >
          {patient.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-ink">
                {patient.firstName} {patient.lastName}
              </h3>

              <p className="mt-1 text-sm text-ink-soft">
                {patient.cancerType} · {patient.stage}
              </p>
            </div>

            <PriorityBadge score={priority.score} tier={priority.tier} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-pine">
              {patient.nextTreatment.label}
            </span>

            <span className="text-ink-soft">
              {patient.nextTreatment.date} · {patient.nextTreatment.time}
            </span>
          </div>

          <div className="mt-4">
            {activeGaps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeGaps.slice(0, 3).map((gap) => (
                  <span
                    key={gap.id}
                    className="
                        rounded-full
                        bg-surface-soft
                        px-3
                        py-1
                        text-xs
                        text-ink-soft
                      "
                  >
                    {gap.title}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-priority-low">
                No active navigation gaps
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          className="
            mt-2
            h-5
            w-5
            shrink-0
            text-ink-soft/40
            transition
            group-hover:translate-x-1
            group-hover:text-pine
          "
        />
      </div>
    </button>
  );
}
