"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { AppHeader } from "@/components/app/AppHeader";
import { ApiError } from "@/lib/api";
import {
  getPatient360,
  resolveNavigationNeed,
} from "@/lib/navigator-api";
import { useAuthStore } from "@/store/auth-store";

import type {
  AttentionStatus,
  Patient360Need,
  Patient360Response,
} from "@/types/navigator";

export default function PatientDetailPage() {
  const params =
    useParams<{ id: string }>();

  const router = useRouter();

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const [patient, setPatient] =
    useState<Patient360Response | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [resolvingNeedId, setResolvingNeedId] =
    useState<string | null>(null);

  const handleRequestError = useCallback(
    (caughtError: unknown) => {
      if (
        caughtError instanceof ApiError &&
        caughtError.status === 401
      ) {
        logout();
        router.replace("/login");
        return true;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Patient 360.",
      );

      return false;
    },
    [logout, router],
  );

  const loadPatient = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await getPatient360(
            params.id,
          );

        setPatient(data);
      } catch (caughtError) {
        handleRequestError(caughtError);
      } finally {
        setIsLoading(false);
      }
    },
    [handleRequestError, params.id],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchPatient() {
      try {
        const data =
          await getPatient360(
            params.id,
          );

        if (!cancelled) {
          setPatient(data);
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

    void fetchPatient();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError, params.id]);

  async function handleResolveNeed(
    needId: string,
  ) {
    if (!patient) {
      return;
    }

    setResolvingNeedId(needId);
    setError(null);

    try {
      await resolveNavigationNeed(
        patient.profile.patient_id,
        needId,
      );

      await loadPatient();
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setResolvingNeedId(null);
    }
  }

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
        <Link
          href="/navigator"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {isLoading && <LoadingState />}

        {!isLoading && error && !patient && (
          <ErrorState
            message={error}
            onRetry={() =>
              void loadPatient()
            }
          />
        )}

        {!isLoading && patient && (
          <>
            {error && (
              <div className="mt-6 rounded-xl bg-priority-high-tint p-4 text-sm text-priority-high">
                {error}
              </div>
            )}

            <PatientHeader
              patient={patient}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-6">
                <AttentionOverview
                  patient={patient}
                />

                <NavigationNeeds
                  needs={
                    patient.open_needs
                  }
                  resolvingNeedId={
                    resolvingNeedId
                  }
                  onResolve={
                    handleResolveNeed
                  }
                />

                <RecentCheckIns
                  patient={patient}
                />

                <Caregivers
                  patient={patient}
                />
              </div>

              <aside className="space-y-6">
                <UpcomingAppointments
                  patient={patient}
                />

                <ActiveTasks
                  patient={patient}
                />
              </aside>
            </div>

            <footer className="mt-10 border-t border-border pt-5">
              <p className="text-xs leading-5 text-ink-soft">
                Compass uses synthetic demo data.
                Attention status reflects
                navigation workflow needs and does
                not represent clinical risk or
                replace care-team judgment.
              </p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

function PatientHeader({
  patient,
}: {
  patient: Patient360Response;
}) {
  const { profile } = patient;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-tint text-lg font-bold text-navy">
            {getInitials(
              profile.first_name,
              profile.last_name,
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Patient 360
            </p>

            <h1 className="mt-1 font-display text-3xl font-bold text-navy-deep">
              {profile.first_name}{" "}
              {profile.last_name}
            </h1>

            <p className="mt-2 text-sm text-ink-soft">
              {profile.care_program ??
                "Cancer Navigation"}{" "}
              · Age{" "}
              {calculateAge(
                profile.date_of_birth,
              )}
            </p>
          </div>
        </div>

        <AttentionBadge
          status={
            patient.attention.status
          }
        />
      </div>

      <div className="mt-7 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
        <InfoItem
          icon={<Mail />}
          label="Email"
          value={profile.email}
        />

        <InfoItem
          icon={<Phone />}
          label="Phone"
          value={
            profile.phone ??
            "Not provided"
          }
        />

        <InfoItem
          icon={<ShieldCheck />}
          label="Patient reference"
          value={
            profile.external_patient_reference ??
            "Not assigned"
          }
        />
      </div>
    </section>
  );
}

function AttentionOverview({
  patient,
}: {
  patient: Patient360Response;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Current Attention
          </p>

          <h2 className="mt-1 text-lg font-semibold text-ink">
            What requires navigation review
          </h2>
        </div>

        <AttentionBadge
          status={
            patient.attention.status
          }
        />
      </div>

      <p className="mt-5 text-sm leading-7 text-ink-soft">
        {patient.attention.explanation}
      </p>

      <div className="mt-5 rounded-xl bg-navy-tint p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy">
          Open navigation needs
        </p>

        <p className="mt-2 text-2xl font-bold text-navy-deep">
          {
            patient.attention
              .open_need_count
          }
        </p>
      </div>
    </section>
  );
}

function NavigationNeeds({
  needs,
  resolvingNeedId,
  onResolve,
}: {
  needs: Patient360Need[];

  resolvingNeedId: string | null;

  onResolve: (
    needId: string,
  ) => Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        Navigation Needs
      </p>

      <h2 className="mt-1 text-lg font-semibold text-ink">
        Why intervention may be needed
      </h2>

      <div className="mt-5 space-y-4">
        {needs.length === 0 ? (
          <div className="rounded-xl bg-priority-low-tint p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-priority-low" />

              <p className="text-sm font-medium text-priority-low">
                No open navigation needs.
              </p>
            </div>
          </div>
        ) : (
          needs.map((need) => (
            <div
              key={need.need_id}
              className="rounded-xl border border-border bg-surface-soft p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {need.title}
                    </p>

                    <AttentionBadge
                      status={
                        need.attention_status
                      }
                    />
                  </div>

                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    {need.explanation}
                  </p>

                  {need.recommended_action && (
                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                        Recommended action
                      </p>

                      <p className="mt-1 text-sm text-ink">
                        {
                          need.recommended_action
                        }
                      </p>
                    </div>
                  )}

                  {need.due_at && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                      <Clock3 className="h-3.5 w-3.5" />
                      Due{" "}
                      {formatDateTime(
                        need.due_at,
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    resolvingNeedId ===
                    need.need_id
                  }
                  onClick={() =>
                    void onResolve(
                      need.need_id,
                    )
                  }
                  className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resolvingNeedId ===
                  need.need_id
                    ? "Resolving..."
                    : "Resolve"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RecentCheckIns({
  patient,
}: {
  patient: Patient360Response;
}) {
  if (
    patient.recent_check_ins.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <UserRound className="h-5 w-5 text-navy" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Recent Check-Ins
          </p>

          <h2 className="mt-1 font-semibold text-ink">
            Patient and caregiver signals
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {patient.recent_check_ins.map(
          (checkIn) => (
            <div
              key={
                checkIn.check_in_id
              }
              className="rounded-xl bg-surface-soft p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize text-ink">
                  {checkIn.source} check-in
                </p>

                <p className="text-xs text-ink-soft">
                  {formatDateTime(
                    checkIn.created_at,
                  )}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <CheckInValue
                  label="Symptom severity"
                  value={
                    checkIn.symptom_severity ===
                    null
                      ? "Not reported"
                      : `${checkIn.symptom_severity} / 10`
                  }
                />

                <CheckInValue
                  label="Transportation"
                  value={formatBooleanState(
                    checkIn.transportation_confirmed,
                    "Confirmed",
                    "Not confirmed",
                  )}
                />

                <CheckInValue
                  label="Medication access"
                  value={
                    checkIn.medication_access_issue
                      ? "Issue reported"
                      : "No issue reported"
                  }
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {checkIn.requested_help && (
                  <SignalChip>
                    Requested help
                  </SignalChip>
                )}

                {checkIn.financial_concern && (
                  <SignalChip>
                    Financial concern
                  </SignalChip>
                )}
              </div>

              {checkIn.free_text && (
                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Note
                  </p>

                  <p className="mt-2 text-sm leading-6 text-ink">
                    {checkIn.free_text}
                  </p>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function Caregivers({
  patient,
}: {
  patient: Patient360Response;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-5 w-5 text-navy" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Caregiver Access
          </p>

          <h2 className="mt-1 font-semibold text-ink">
            Authorized support
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {patient.caregivers.length ===
        0 ? (
          <p className="text-sm text-ink-soft">
            No caregiver relationship is
            currently available.
          </p>
        ) : (
          patient.caregivers.map(
            (caregiver) => (
              <div
                key={
                  caregiver.caregiver_access_id
                }
                className="rounded-xl bg-surface-soft p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {
                        caregiver.first_name
                      }{" "}
                      {
                        caregiver.last_name
                      }
                    </p>

                    <p className="mt-1 text-xs text-ink-soft">
                      {
                        caregiver.relationship
                      }{" "}
                      ·{" "}
                      {formatStatus(
                        caregiver.status,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {caregiver.permissions.map(
                    (permission) => (
                      <span
                        key={permission}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft"
                      >
                        {formatStatus(
                          permission,
                        )}
                      </span>
                    ),
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

function UpcomingAppointments({
  patient,
}: {
  patient: Patient360Response;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:sticky lg:top-24">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-navy" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Upcoming
          </p>

          <h2 className="mt-1 font-semibold text-ink">
            Appointments
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {patient.upcoming_appointments
          .length === 0 ? (
          <p className="text-sm text-ink-soft">
            No upcoming appointments.
          </p>
        ) : (
          patient.upcoming_appointments.map(
            (appointment) => (
              <div
                key={
                  appointment.appointment_id
                }
                className="rounded-xl bg-surface-soft p-4"
              >
                <p className="text-sm font-semibold text-ink">
                  {appointment.title}
                </p>

                <p className="mt-2 text-xs text-ink-soft">
                  {formatDateTime(
                    appointment.scheduled_start,
                  )}
                </p>

                {appointment.location_name && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {
                      appointment.location_name
                    }
                  </p>
                )}

                {appointment.provider_name && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {
                      appointment.provider_name
                    }
                  </p>
                )}
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}

function ActiveTasks({
  patient,
}: {
  patient: Patient360Response;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        Navigator Work
      </p>

      <h2 className="mt-1 font-semibold text-ink">
        Active tasks
      </h2>

      <div className="mt-5 space-y-3">
        {patient.active_tasks.length ===
        0 ? (
          <p className="text-sm text-ink-soft">
            No active navigation tasks.
          </p>
        ) : (
          patient.active_tasks.map(
            (task) => (
              <div
                key={task.task_id}
                className="rounded-xl bg-surface-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {task.title}
                  </p>

                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft">
                    {formatStatus(
                      task.status,
                    )}
                  </span>
                </div>

                {task.description && (
                  <p className="mt-2 text-xs leading-5 text-ink-soft">
                    {task.description}
                  </p>
                )}

                {task.due_at && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                    <Clock3 className="h-3.5 w-3.5" />
                    Due{" "}
                    {formatDateTime(
                      task.due_at,
                    )}
                  </p>
                )}
              </div>
            ),
          )
        )}
      </div>
    </section>
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

      <div className="min-w-0">
        <p className="text-xs text-ink-soft">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-ink">
          {value}
        </p>
      </div>
    </div>
  );
}

function AttentionBadge({
  status,
}: {
  status: AttentionStatus;
}) {
  const styles: Record<
    AttentionStatus,
    string
  > = {
    needs_attention:
      "bg-priority-high-tint text-priority-high",

    follow_up:
      "bg-gold-tint text-navy-deep",

    on_track:
      "bg-priority-low-tint text-priority-low",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function CheckInValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs text-ink-soft">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}

function SignalChip({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-gold-tint px-2.5 py-1 text-xs font-semibold text-navy-deep">
      {children}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="mt-10 flex min-h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-navy" />

        <p className="mt-3 text-sm text-ink-soft">
          Loading Patient 360...
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
    <div className="mt-10 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

        <div>
          <p className="font-semibold text-ink">
            Unable to load Patient 360
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

function getInitials(
  firstName: string,
  lastName: string,
) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(
  dateOfBirth: string,
) {
  const birthDate =
    new Date(dateOfBirth);

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
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

function formatBooleanState(
  value: boolean | null,
  trueLabel: string,
  falseLabel: string,
) {
  if (value === null) {
    return "Not reported";
  }

  return value
    ? trueLabel
    : falseLabel;
}