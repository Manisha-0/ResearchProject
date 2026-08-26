"use client";

import { CalendarDays, Car, MapPin } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { Appointments } from "@/components/patient/Appointments";
import { CareJourney } from "@/components/patient/CareJourney";
import { CheckInForm } from "@/components/patient/CheckInForm";
import { PatientDocuments } from "@/components/patient/PatientDocuments";
import { useCompassStore } from "@/store/compass-store";

export default function PatientPage() {
  const patients = useCompassStore((state) => state.patients);

  const patient = patients.find((item) => item.id === "manisha-johnson");

  if (!patient) {
    return null;
  }

  const latestCheckIn = patient.checkIns[0] ?? null;

  const transportStatus =
    latestCheckIn?.transportStatus ?? patient.baselineTransportStatus;

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <section>
          <p className="text-sm text-ink-soft">Welcome back,</p>

          <h1 className="mt-1 font-display text-3xl font-bold text-navy-deep">
            {patient.firstName}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Everything Compass knows about your navigation journey is organized
            here — what&apos;s happened, what&apos;s next, and where you may
            need support.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Next Step
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row">
            <div>
              <h2 className="text-xl font-semibold text-navy-deep">
                {patient.nextTreatment.label}
              </h2>

              <div className="mt-4 space-y-2 text-sm text-ink-soft">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-navy" />
                  {patient.nextTreatment.date} · {patient.nextTreatment.time}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-navy" />
                  Ochsner Cancer Center
                </div>

                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-navy" />
                  Transportation:{" "}
                  <strong>
                    {transportStatus === "confirmed"
                      ? "Confirmed"
                      : transportStatus === "not_sure"
                        ? "Not sure"
                        : "Needs help"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-navy-tint p-4 sm:max-w-xs">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                Compass reminder
              </p>

              <p className="mt-2 text-sm leading-6 text-navy-deep">
                Complete today&apos;s check-in so your navigator knows if
                anything has changed before treatment.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <CareJourney journey={patient.journey} />

            <PatientDocuments documents={patient.documents} />
          </div>

          <div className="space-y-6">
            <CheckInForm patientId={patient.id} />

            <Appointments appointments={patient.appointments} />
          </div>
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-ink-soft">
          Prototype uses synthetic patient data. Compass supports navigation and
          coordination and does not make clinical decisions.
        </p>
      </div>
    </main>
  );
}
