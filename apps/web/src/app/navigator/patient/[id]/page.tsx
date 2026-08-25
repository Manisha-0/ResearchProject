"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { PriorityBadge } from "@/components/navigator/PriorityBadge";
import { computePriority } from "@/lib/scoring";
import { AppHeader } from "@/components/app/AppHeader";
import { buildNavigatorSummary } from "@/lib/summaries";
import type { CareGap, PriorityReason } from "@/lib/types";
import { useCompassStore } from "@/store/compass-store";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();

  const patient = useCompassStore((state) =>
    state.patients.find((item) => item.id === params.id),
  );

  const resolveGap = useCompassStore((state) => state.resolveGap);

  if (!patient) {
    return (
      <main className="min-h-screen bg-surface-soft px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-ink-soft">Patient not found.</p>

          <Link
            href="/navigator"
            className="mt-4 inline-block font-medium text-navy"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const priority = computePriority(patient);
  const summary = buildNavigatorSummary(patient);
  const latestCheckIn = patient.checkIns[0] ?? null;

  const activeGaps = patient.careGaps.filter(
    (gap) => gap.status !== "resolved",
  );

  const resolvedGaps = patient.careGaps.filter(
    (gap) => gap.status === "resolved",
  );

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader currentRole="navigator" showReset />
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
        <Link
          href="/navigator"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-tint text-lg font-bold text-navy">
                {patient.initials}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                  Patient 360
                </p>

                <h1 className="mt-1 font-display text-3xl font-bold text-navy-deep">
                  {patient.firstName} {patient.lastName}
                </h1>

                <p className="mt-2 text-sm text-ink-soft">
                  {patient.cancerType} · {patient.stage} · Age {patient.age}
                </p>
              </div>
            </div>

            <PriorityBadge score={priority.score} tier={priority.tier} />
          </div>

          <div className="mt-7 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <InfoItem
              icon={<CalendarDays />}
              label="Next treatment"
              value={patient.nextTreatment.label}
            />

            <InfoItem
              icon={<Clock3 />}
              label="When"
              value={`${patient.nextTreatment.date} · ${patient.nextTreatment.time}`}
            />

            <InfoItem
              icon={<ShieldCheck />}
              label="Authorization"
              value={patient.authorizationPending ? "Pending" : "Confirmed"}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-tint">
                  <Sparkles className="h-5 w-5 text-navy" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                    Compass Summary
                  </p>

                  <h2 className="mt-1 font-semibold text-ink">
                    What needs attention
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-ink-soft">{summary}</p>

              <div className="mt-5 rounded-xl bg-navy-tint p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                  Suggested navigation focus
                </p>

                <p className="mt-2 text-sm font-medium text-navy-deep">
                  {getNavigationFocus(patient)}
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-ink-soft">
                Generated from this synthetic Compass record. Priority is
                determined separately by transparent rules.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                  Active Care Gaps
                </p>

                <h2 className="mt-1 text-lg font-semibold text-ink">
                  Why intervention may be needed
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                {activeGaps.length === 0 ? (
                  <div className="rounded-xl bg-priority-low-tint p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-priority-low" />

                      <p className="text-sm font-medium text-priority-low">
                        No active navigation gaps.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeGaps.map((gap) => (
                    <CareGapCard
                      key={gap.id}
                      gap={gap}
                      onResolve={() =>
                        resolveGap(patient.id, gap.id, "James Wilson")
                      }
                    />
                  ))
                )}
              </div>
            </section>

            {latestCheckIn && (
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-navy" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                      Latest Check-In
                    </p>

                    <h2 className="mt-1 font-semibold text-ink">
                      Patient-reported update
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <CheckInValue
                    label="Nausea"
                    value={formatValue(latestCheckIn.nausea)}
                  />

                  <CheckInValue
                    label="Transportation"
                    value={formatValue(latestCheckIn.transportStatus)}
                  />

                  <CheckInValue
                    label="Medication"
                    value={formatValue(latestCheckIn.medicationStatus)}
                  />
                </div>

                {latestCheckIn.note && (
                  <div className="mt-5 rounded-xl bg-surface-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Patient note
                    </p>

                    <p className="mt-2 text-sm italic leading-6 text-ink">
                      “{latestCheckIn.note}”
                    </p>
                  </div>
                )}
              </section>
            )}

            {resolvedGaps.length > 0 && (
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                  Resolution History
                </p>

                <div className="mt-4 space-y-3">
                  {resolvedGaps.map((gap) => (
                    <div
                      key={gap.id}
                      className="flex gap-3 rounded-xl bg-priority-low-tint p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-priority-low" />

                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {gap.title}
                        </p>

                        <p className="mt-1 text-xs text-ink-soft">
                          Resolved by {gap.resolvedBy ?? "Navigator"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside>
            <section className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:sticky lg:top-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                Navigation Priority
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight text-navy-deep">
                  {priority.score}
                </span>

                <span className="pb-1 text-sm text-ink-soft">/ 100</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-ink-soft">
                Compass adds transparent points for known navigation barriers.
              </p>

              <div className="mt-6 space-y-3">
                {priority.reasons.map((reason) => (
                  <PriorityReasonRow key={reason.key} reason={reason} />
                ))}
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs leading-5 text-ink-soft">
                  Navigation Priority is not a clinical-risk score and does not
                  replace care-team judgment.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-navy">
        {icon}
      </div>

      <div>
        <p className="text-xs text-ink-soft">{label}</p>

        <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function PriorityReasonRow({ reason }: { reason: PriorityReason }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-surface-soft p-3">
      <p className="text-sm leading-5 text-ink-soft">{reason.label}</p>

      <span className="shrink-0 text-sm font-bold text-navy">
        +{reason.points}
      </span>
    </div>
  );
}

function CareGapCard({
  gap,
  onResolve,
}: {
  gap: CareGap;
  onResolve: () => void;
}) {
  const canResolve = gap.type === "transportation";

  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{gap.title}</p>

          <p className="mt-1 max-w-xl text-sm leading-6 text-ink-soft">
            {gap.description}
          </p>
        </div>

        {canResolve && (
          <button
            type="button"
            onClick={onResolve}
            className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}

function CheckInValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-soft p-4">
      <p className="text-xs text-ink-soft">{label}</p>

      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getNavigationFocus(patient: { careGaps: CareGap[] }) {
  const activeTypes = new Set(
    patient.careGaps
      .filter((gap) => gap.status !== "resolved")
      .map((gap) => gap.type),
  );

  const focus: string[] = [];

  if (activeTypes.has("transportation")) {
    focus.push("transportation");
  }

  if (activeTypes.has("authorization")) {
    focus.push("authorization follow-up");
  }

  if (activeTypes.has("symptom")) {
    focus.push("review today's symptom report");
  }

  if (activeTypes.has("medication")) {
    focus.push("medication access");
  }

  if (focus.length === 0) {
    return "No immediate navigation follow-up identified.";
  }

  return focus
    .map((item, index) =>
      index === 0 ? item.charAt(0).toUpperCase() + item.slice(1) : item,
    )
    .join(" · ");
}
