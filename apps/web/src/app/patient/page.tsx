"use client";

import { CalendarDays, Car, MapPin } from "lucide-react";
import { CheckInForm } from "@/components/patient/CheckInForm";
import { useCompassStore } from "@/store/compass-store";
import { AppHeader } from "@/components/app/AppHeader";

export default function PatientPage() {
  const patient = useCompassStore((state) =>
    state.patients.find((item) => item.id === "manisha-johnson"),
  );

  if (!patient) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader currentRole="patient" />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <section>
          <p className="text-sm text-ink-soft">Good afternoon,</p>

          <h1 className="mt-1 font-display text-3xl font-bold text-navy-deep">
            Manisha
          </h1>

          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Here&apos;s what&apos;s coming up in your care journey.
          </p>
        </section>

        <section className="mt-7 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                Tomorrow
              </p>

              <h2 className="mt-2 text-xl font-semibold text-navy-deep">
                {patient.nextTreatment.label}
              </h2>
            </div>

            <CalendarDays className="h-7 w-7 text-navy" />
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-ink-soft">
              <CalendarDays className="h-4 w-4 text-navy" />

              <span>
                {patient.nextTreatment.date} · {patient.nextTreatment.time}
              </span>
            </div>

            <div className="flex items-center gap-3 text-ink-soft">
              <MapPin className="h-4 w-4 text-navy" />

              <span>Ochsner Cancer Center</span>
            </div>

            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-navy" />

              <span className="text-ink-soft">Transportation:</span>

              <span className="font-semibold text-priority-low">Confirmed</span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <CheckInForm patientId={patient.id} />
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold text-ink">Your care journey</h2>

          <div className="mt-5 space-y-5">
            <JourneyItem title="Diagnosis" detail="Completed" complete />

            <JourneyItem title="Treatment plan" detail="Completed" complete />

            <JourneyItem title="Chemotherapy" detail="Current stage" active />

            <JourneyItem title="Follow-up" detail="Coming next" />
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-ink-soft">
          Prototype uses synthetic patient data. Compass does not provide
          medical advice or make clinical decisions.
        </p>
      </div>
    </main>
  );
}

type JourneyItemProps = {
  title: string;
  detail: string;
  complete?: boolean;
  active?: boolean;
};

function JourneyItem({
  title,
  detail,
  complete = false,
  active = false,
}: JourneyItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          complete
            ? "border-priority-low bg-priority-low-tint text-priority-low"
            : active
              ? "border-gold bg-gold-tint text-navy-deep"
              : "border-border bg-surface-soft text-ink-soft",
        ].join(" ")}
      >
        {complete ? "✓" : active ? "●" : "○"}
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>

        <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}
