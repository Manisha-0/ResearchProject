"use client";

import {
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  HeartHandshake,
  MapPin,
} from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { useCompassStore } from "@/store/compass-store";

export default function CaregiverPage() {
  const patients = useCompassStore((state) => state.patients);
  const resolveGap = useCompassStore((state) => state.resolveGap);
  const patient = patients.find((item) => item.id === "maria-johnson");

  if (!patient) {
    return (
      <main className="min-h-screen bg-surface-soft">
        <AppHeader currentRole="caregiver" />

        <div className="mx-auto max-w-3xl px-5 py-10">
          <p className="text-sm text-ink-soft">
            Patient record could not be found.
          </p>
        </div>
      </main>
    );
  }

  const patientId = patient.id;
  const latestCheckIn = patient.checkIns[0] ?? null;

  const transportGap = patient.careGaps.find(
    (gap) => gap.type === "transportation" && gap.status !== "resolved",
  );

  const transportConfirmed = latestCheckIn
    ? latestCheckIn.transportStatus === "confirmed"
    : patient.baselineTransportStatus === "confirmed";

  function confirmTransportation() {
    if (!transportGap) {
      return;
    }

    resolveGap(patientId, transportGap.id, "Danielle Johnson · Caregiver");
  }

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader currentRole="caregiver" />

      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        <section>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-tint">
              <HeartHandshake className="h-5 w-5 text-navy" />
            </div>

            <div>
              <p className="text-sm text-ink-soft">Caregiver view</p>

              <h1 className="font-display text-3xl font-bold text-navy-deep">
                Helping Maria
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">
            Hi Danielle. Here&apos;s what you can help coordinate for Maria
            today.
          </p>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Tomorrow
            </p>

            <div className="mt-2 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-navy-deep">
                  {patient.nextTreatment.label}
                </h2>

                <p className="mt-1 text-sm text-ink-soft">
                  {patient.firstName}&apos;s next appointment
                </p>
              </div>

              <CalendarDays className="h-6 w-6 text-navy" />
            </div>

            <div className="mt-5 space-y-3">
              <DetailRow
                icon={<Clock3 />}
                text={`${patient.nextTreatment.date} · ${patient.nextTreatment.time}`}
              />

              <DetailRow icon={<MapPin />} text="Ochsner Cancer Center" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  transportConfirmed
                    ? "bg-priority-low-tint"
                    : "bg-priority-high-tint",
                ].join(" ")}
              >
                <Car
                  className={[
                    "h-5 w-5",
                    transportConfirmed
                      ? "text-priority-low"
                      : "text-priority-high",
                  ].join(" ")}
                />
              </div>

              <div className="flex-1">
                <p className="font-semibold text-ink">Transportation</p>

                {transportConfirmed ? (
                  <>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-priority-low">
                      <CheckCircle2 className="h-4 w-4" />
                      Ride confirmed
                    </div>

                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Transportation is confirmed for tomorrow&apos;s treatment.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-medium text-priority-high">
                      Maria does not have a confirmed ride.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      You can let the navigation team know that you&apos;re able
                      to drive her.
                    </p>

                    <button
                      type="button"
                      onClick={confirmTransportation}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep"
                    >
                      <Car className="h-4 w-4" />I can drive Maria
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Your Access
            </p>

            <h2 className="mt-1 text-lg font-semibold text-ink">
              What Maria has shared with you
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Caregiver access is scoped by category, not all-or-nothing.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Permission allowed label="Appointments" />

            <Permission allowed label="Transportation" />

            <Permission allowed label="Care tasks" />

            <Permission label="Clinical notes" />

            <Permission label="Navigator notes" />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-navy p-5 text-white sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Need help?
          </p>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Contact Maria&apos;s navigator</h2>

              <p className="mt-1 text-sm leading-6 text-white/65">
                Ask a question about appointments, transportation, or care
                coordination.
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-gold" />
          </div>
        </section>

        <p className="mt-7 text-center text-xs leading-5 text-ink-soft">
          Prototype uses synthetic patient data. Caregiver permissions shown
          here are for demonstration purposes.
        </p>
      </div>
    </main>
  );
}

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft">
      <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-navy">{icon}</span>

      <span>{text}</span>
    </div>
  );
}

function Permission({
  label,
  allowed = false,
}: {
  label: string;
  allowed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-soft px-4 py-3">
      <div className="flex items-center gap-3">
        {allowed ? (
          <Eye className="h-4 w-4 text-priority-low" />
        ) : (
          <EyeOff className="h-4 w-4 text-ink-soft" />
        )}

        <span className="text-sm font-medium text-ink">{label}</span>
      </div>

      {allowed ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-priority-low">
          <Check className="h-3.5 w-3.5" />
          Shared
        </span>
      ) : (
        <span className="text-xs font-medium text-ink-soft">Not shared</span>
      )}
    </div>
  );
}
