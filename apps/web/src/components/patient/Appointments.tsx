import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";

import type {
  PatientAppointment,
} from "@/types/patient";

export function Appointments({
  appointments,
}: {
  appointments: PatientAppointment[];
}) {
  const orderedAppointments = [
    ...appointments,
  ].sort(
    (first, second) =>
      new Date(
        first.scheduled_start,
      ).getTime() -
      new Date(
        second.scheduled_start,
      ).getTime(),
  );

  return (
    <section className="border-t border-border pt-8">
      <h2 className="text-[1.5rem] font-bold leading-tight text-pine-deep">
        My appointments
      </h2>

      <div className="mt-6 space-y-3">
        {orderedAppointments.length ===
        0 ? (
          <p className="text-base text-ink-soft">
            No appointments are currently
            available.
          </p>
        ) : (
          orderedAppointments.map(
            (appointment) => (
              <div
                key={appointment.id}
                className="rounded-xl bg-surface-soft p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">
                      {
                        appointment.title
                      }
                    </p>

                    <p className="mt-1 text-sm font-medium text-ink-soft">
                      {formatStatus(
                        appointment.status,
                      )}
                    </p>
                  </div>

                  <CalendarDays className="h-5 w-5 shrink-0 text-pine" />
                </div>

                <div className="mt-4 space-y-2 text-base text-ink-soft">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 shrink-0 text-pine" />

                    {formatDateTime(
                      appointment.scheduled_start,
                    )}
                  </div>

                  {(appointment.location_name ||
                    appointment.address_text) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pine" />

                      <span>
                        {[
                          appointment.location_name,
                          appointment.address_text,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  )}

                  {appointment.provider_name && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0 text-pine" />

                      {
                        appointment.provider_name
                      }
                    </div>
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function formatStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}