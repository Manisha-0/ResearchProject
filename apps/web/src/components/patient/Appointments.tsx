import { CalendarDays, Clock3, MapPin } from "lucide-react";

import type { Appointment } from "@/lib/types";

export function Appointments({
  appointments,
}: {
  appointments: Appointment[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        Appointments
      </p>

      <h2 className="mt-1 text-xl font-semibold text-navy-deep">
        My appointments
      </h2>

      <div className="mt-6 space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-xl bg-surface-soft p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink">{appointment.title}</p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {appointment.status}
                </p>
              </div>

              <CalendarDays className="h-5 w-5 text-navy" />
            </div>

            <div className="mt-4 space-y-2 text-sm text-ink-soft">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-navy" />
                {appointment.date} · {appointment.time}
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-navy" />

                {appointment.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
