"use client";

import {
  AlertCircle,
  CalendarDays,
  Car,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import { AppHeader } from "@/components/app/AppHeader";
import { Appointments } from "@/components/patient/Appointments";
import { CareJourney } from "@/components/patient/CareJourney";
import { CheckInForm } from "@/components/patient/CheckInForm";
import { PatientDocuments } from "@/components/patient/PatientDocuments";

import { ApiError } from "@/lib/api";
import { getMyJourney } from "@/lib/patient-api";

import { useAuthStore } from "@/store/auth-store";

import type {
  CheckInResponse,
  PatientAppointment,
  PatientJourneyItem,
} from "@/types/patient";

export default function PatientPage() {
  const router = useRouter();

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const [journey, setJourney] =
    useState<PatientJourneyItem[]>(
      [],
    );

  const [
    latestCheckIn,
    setLatestCheckIn,
  ] =
    useState<CheckInResponse | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const handleRequestError =
    useCallback(
      (caughtError: unknown) => {
        if (
          caughtError instanceof
            ApiError &&
          caughtError.status === 401
        ) {
          logout();
          router.replace("/login");
          return true;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your care journey.",
        );

        return false;
      },
      [logout, router],
    );

  const loadJourney = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await getMyJourney();

        setJourney(data);
      } catch (caughtError) {
        handleRequestError(
          caughtError,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [handleRequestError],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchJourney() {
      try {
        const data =
          await getMyJourney();

        if (!cancelled) {
          setJourney(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          handleRequestError(
            caughtError,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchJourney();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError]);

  const appointments =
    useMemo(
      () =>
        getAppointmentsFromJourney(
          journey,
        ),
      [journey],
    );

  const nextAppointment =
    useMemo(
      () =>
        getNextAppointment(
          appointments,
        ),
      [appointments],
    );

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <section>
          <p className="text-sm text-ink-soft">
            Welcome back.
          </p>

          <h1 className="mt-1 font-display text-3xl font-bold text-navy-deep">
            My Compass
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Everything Compass knows about
            your navigation journey is
            organized here — what&apos;s
            happened, what&apos;s next, and
            where you may need support.
          </p>
        </section>

        {isLoading && (
          <LoadingState />
        )}

        {!isLoading &&
          error && (
            <ErrorState
              message={error}
              onRetry={() =>
                void loadJourney()
              }
            />
          )}

        {!isLoading &&
          !error && (
            <>
              <NextStep
                appointment={
                  nextAppointment
                }
                latestCheckIn={
                  latestCheckIn
                }
              />

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <CareJourney
                    journey={journey}
                  />

                  <PatientDocuments />
                </div>

                <div className="space-y-6">
                  <CheckInForm
                    onSubmitted={
                      setLatestCheckIn
                    }
                  />

                  <Appointments
                    appointments={
                      appointments
                    }
                  />
                </div>
              </div>

              <p className="mt-8 text-center text-xs leading-5 text-ink-soft">
                Compass uses synthetic demo
                patient information and
                supports navigation and
                coordination. It does not
                make clinical decisions.
              </p>
            </>
          )}
      </div>
    </main>
  );
}

function NextStep({
  appointment,
  latestCheckIn,
}: {
  appointment:
    | PatientAppointment
    | null;

  latestCheckIn:
    | CheckInResponse
    | null;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        Next Step
      </p>

      <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row">
        <div>
          {appointment ? (
            <>
              <h2 className="text-xl font-semibold text-navy-deep">
                {appointment.title}
              </h2>

              <div className="mt-4 space-y-2 text-sm text-ink-soft">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-navy" />

                  {formatDateTime(
                    appointment.scheduled_start,
                  )}
                </div>

                {(appointment.location_name ||
                  appointment.address_text) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy" />

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

                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 shrink-0 text-navy" />

                  Transportation:{" "}

                  <strong>
                    {getTransportationLabel(
                      latestCheckIn,
                    )}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-navy-deep">
                No upcoming appointment
              </h2>

              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Your care navigation team
                has not added an upcoming
                appointment yet.
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl bg-navy-tint p-4 sm:max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy">
            Compass reminder
          </p>

          <p className="mt-2 text-sm leading-6 text-navy-deep">
            Complete today&apos;s check-in
            so your navigator knows if
            anything has changed before
            your next step.
          </p>
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 flex min-h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-navy" />

        <p className="mt-3 text-sm text-ink-soft">
          Loading your care journey...
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

        <div>
          <p className="font-semibold text-ink">
            Unable to load your Compass
            journey
          </p>

          <p className="mt-1 text-sm text-ink-soft">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function getAppointmentsFromJourney(
  journey: PatientJourneyItem[],
) {
  const appointments =
    journey.flatMap((item) =>
      item.appointment
        ? [item.appointment]
        : [],
    );

  const uniqueAppointments =
    new Map<
      string,
      PatientAppointment
    >();

  for (const appointment of appointments) {
    uniqueAppointments.set(
      appointment.id,
      appointment,
    );
  }

  return Array.from(
    uniqueAppointments.values(),
  );
}

function getNextAppointment(
  appointments: PatientAppointment[],
) {
  const scheduled =
    appointments
      .filter(
        (appointment) =>
          appointment.status ===
          "scheduled",
      )
      .sort(
        (first, second) =>
          new Date(
            first.scheduled_start,
          ).getTime() -
          new Date(
            second.scheduled_start,
          ).getTime(),
      );

  return scheduled[0] ?? null;
}

function getTransportationLabel(
  checkIn: CheckInResponse | null,
) {
  if (!checkIn) {
    return "Check in today";
  }

  if (
    checkIn.transportation_confirmed ===
    true
  ) {
    return "Confirmed";
  }

  if (
    checkIn.transportation_confirmed ===
    false
  ) {
    return "Needs help";
  }

  return "Not sure";
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