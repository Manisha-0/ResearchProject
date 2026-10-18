"use client";

import {
  AlertCircle,
  CalendarDays,
  Car,
  LoaderCircle,
  MapPin,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/AppHeader";
import { Appointments } from "@/components/patient/Appointments";
import { CaregiverAccess } from "@/components/patient/CaregiverAccess";
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

  const logout = useAuthStore((state) => state.logout);

  const [journey, setJourney] = useState<PatientJourneyItem[]>([]);

  const [latestCheckIn, setLatestCheckIn] = useState<CheckInResponse | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const handleRequestError = useCallback(
    (caughtError: unknown) => {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
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

  const loadJourney = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getMyJourney();

      setJourney(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchJourney() {
      try {
        const data = await getMyJourney();

        if (!cancelled) {
          setJourney(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          handleRequestError(caughtError);
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

  const appointments = useMemo(
    () => getAppointmentsFromJourney(journey),
    [journey],
  );

  const nextAppointment = useMemo(
    () => getNextAppointment(appointments),
    [appointments],
  );

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-[2rem] font-bold leading-tight text-pine-deep sm:text-[2.4rem]">
          {greeting()}
        </h1>

        {isLoading && <LoadingState />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void loadJourney()} />
        )}

        {!isLoading && !error && (
          <>
            <NextAppointmentCard
              appointment={nextAppointment}
              latestCheckIn={latestCheckIn}
            />

            <div className="mt-10 space-y-10">
              <CheckInForm onSubmitted={setLatestCheckIn} />

              <CareJourney journey={journey} />

              <Appointments appointments={appointments} />

              <PatientDocuments />

              <CaregiverAccess />
            </div>

            <p className="mt-12 max-w-xl text-sm leading-6 text-ink-soft">
              Compass helps you and your care team stay organized. It does not
              give medical advice. If you feel very unwell, call your clinic or
              911.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function NextAppointmentCard({
  appointment,
  latestCheckIn,
}: {
  appointment: PatientAppointment | null;
  latestCheckIn: CheckInResponse | null;
}) {
  if (!appointment) {
    return (
      <section className="mt-6 rounded-[14px] border border-border bg-white p-6">
        <h2 className="text-xl font-bold text-ink">No visits booked yet</h2>
        <p className="mt-2 text-ink-soft">
          When your care team books your next visit, it will show here.
        </p>
      </section>
    );
  }

  const start = new Date(appointment.scheduled_start);
  const place = [appointment.location_name, appointment.address_text]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-labelledby="next-visit"
      className="appointment-card mt-6 flex flex-col overflow-hidden sm:flex-row"
    >
      <div className="flex-1 py-6 pr-6">
        <p id="next-visit" className="font-semibold">
          Your next visit {relativeDay(start)}
        </p>

        <p className="mt-2 text-[1.75rem] font-bold leading-tight sm:text-[2rem]">
          {new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(start)}
          <br />
          {new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(start)}
        </p>

        <dl className="mt-5 space-y-2 text-[1.05rem]">
          <div className="flex gap-3">
            <dt className="sr-only">Visit</dt>
            <CalendarDays aria-hidden className="mt-1 h-5 w-5 shrink-0" />
            <dd>
              {appointment.title}
              {appointment.provider_name &&
                ` with ${appointment.provider_name}`}
            </dd>
          </div>

          {place && (
            <div className="flex gap-3">
              <dt className="sr-only">Where</dt>
              <MapPin aria-hidden className="mt-1 h-5 w-5 shrink-0" />
              <dd>
                {place}{" "}
                <a
                  className="whitespace-nowrap font-semibold underline underline-offset-4"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="appointment-card-stub flex flex-col justify-center gap-4 py-6 pr-6 sm:w-64 sm:pl-6">
        <div className="flex gap-3">
          <Car aria-hidden className="mt-1 h-5 w-5 shrink-0" />
          <p>
            <span className="block font-semibold">Ride</span>
            {getTransportationLabel(latestCheckIn)}
          </p>
        </div>

        <div className="flex gap-3">
          <Phone aria-hidden className="mt-1 h-5 w-5 shrink-0" />
          <p className="text-[0.95rem] leading-6">
            We will phone you before this visit to check you are ready. A family
            member can answer for you.
          </p>
        </div>
      </div>
    </section>
  );
}

function relativeDay(date: Date) {
  const now = new Date();
  const dayStart = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(date) - dayStart(now)) / 86_400_000);

  if (days === 0) return "is today";
  if (days === 1) return "is tomorrow";
  if (days > 1 && days < 7) return `is in ${days} days`;
  return "";
}

function LoadingState() {
  return (
    <div className="mt-6 flex min-h-48 items-center gap-3 text-ink-soft">
      <LoaderCircle className="h-5 w-5 animate-spin text-pine" />
      Loading your visits…
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
    <div className="mt-6 rounded-[14px] border border-priority-high/30 bg-priority-high-tint p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

        <div>
          <p className="font-semibold text-ink">
            We could not load your information
          </p>

          <p className="mt-1 text-ink-soft">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-pine px-5 py-3 font-semibold text-white transition hover:bg-pine-deep"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function getAppointmentsFromJourney(journey: PatientJourneyItem[]) {
  const appointments = journey.flatMap((item) =>
    item.appointment ? [item.appointment] : [],
  );

  const uniqueAppointments = new Map<string, PatientAppointment>();

  for (const appointment of appointments) {
    uniqueAppointments.set(appointment.id, appointment);
  }

  return Array.from(uniqueAppointments.values());
}

function getNextAppointment(appointments: PatientAppointment[]) {
  const scheduled = appointments
    .filter((appointment) => appointment.status === "scheduled")
    .sort(
      (first, second) =>
        new Date(first.scheduled_start).getTime() -
        new Date(second.scheduled_start).getTime(),
    );

  return scheduled[0] ?? null;
}

function getTransportationLabel(checkIn: CheckInResponse | null) {
  if (!checkIn) {
    return "Tell us in today's check-in";
  }

  if (checkIn.transportation_confirmed === true) {
    return "Ride is set";
  }

  if (checkIn.transportation_confirmed === false) {
    return "Needs a ride. Your navigator can help.";
  }

  return "Not sure";
}
