"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Plus,
  UsersRound,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/app/AppHeader";

import { AddPatientDialog } from "@/components/navigator/AddPatientDialog";

import { ApiError } from "@/lib/api";

import { getNavigatorDashboard } from "@/lib/navigator-api";

import { useAuthStore } from "@/store/auth-store";

import type {
  AttentionStatus,
  NavigatorDashboardResponse,
} from "@/types/navigator";

export default function NavigatorDashboard() {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [dashboard, setDashboard] = useState<NavigatorDashboardResponse | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showAddPatient, setShowAddPatient] = useState(false);

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
          : "Unable to load the navigator dashboard.",
      );

      return false;
    },
    [logout, router],
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const data = await getNavigatorDashboard();

      setDashboard(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const data = await getNavigatorDashboard();

        if (!cancelled) {
          setDashboard(data);
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

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError]);

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gold">
              NAVIGATOR ACTION CENTER
            </p>

            <div className="mt-2 max-w-2xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-navy-deep sm:text-4xl">
                {getGreeting()}.
              </h1>

              <p className="mt-3 text-base leading-7 text-ink-soft">
                Here&apos;s where your attention may be needed today.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPatient(true)}
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-navy
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-navy-deep
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-gold
              focus-visible:ring-offset-2
            "
          >
            <Plus className="h-4 w-4" />
            Add patient
          </button>
        </section>

        {isLoading && <LoadingState />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void loadDashboard()} />
        )}

        {!isLoading && !error && dashboard && (
          <>
            <section className="mt-8">
              <DashboardSummary dashboard={dashboard} />
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    Assigned patients
                  </h2>

                  <p className="mt-1 text-sm text-ink-soft">
                    Ordered by current navigation attention needs.
                  </p>
                </div>

                <p className="text-sm text-ink-soft">
                  {dashboard.counts.total_patients} patients
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {dashboard.patients.length === 0 ? (
                  <EmptyState message="No patients are currently assigned to you." />
                ) : (
                  dashboard.patients.map((patient) => (
                    <PatientCard key={patient.patient_id} patient={patient} />
                  ))
                )}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    Navigator tasks
                  </h2>

                  <p className="mt-1 text-sm text-ink-soft">
                    Open coordination work across your assigned patients.
                  </p>
                </div>

                <Link
                  href="/navigator/tasks"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-navy transition hover:text-navy-deep"
                >
                  View work queue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {dashboard.tasks.length === 0 ? (
                  <EmptyState message="No open navigator tasks." />
                ) : (
                  dashboard.tasks.map((task) => (
                    <Link
                      key={task.task_id}
                      href={`/navigator/patient/${task.patient_id}`}
                      className="block rounded-2xl border border-border bg-white p-5 transition hover:border-navy/25 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-navy" />

                            <p className="font-semibold text-ink">
                              {task.title}
                            </p>
                          </div>

                          <p className="mt-2 text-sm text-ink-soft">
                            {task.patient_first_name} {task.patient_last_name}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <TaskStatusBadge status={task.status} />

                          {task.due_at && (
                            <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                              <Clock3 className="h-3.5 w-3.5" />
                              Due {formatDateTime(task.due_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {dashboard.tasks.length > 0 && (
                <div className="mt-4">
                  <Link
                    href="/navigator/tasks"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-navy/30 hover:bg-navy-tint"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Open full work queue
                  </Link>
                </div>
              )}
            </section>

            <footer className="mt-10 border-t border-border pt-5">
              <p className="text-xs leading-5 text-ink-soft">
                Compass uses synthetic demo patient data. Attention status is
                generated from transparent navigation rules and represents
                workflow coordination needs, not clinical risk.
              </p>
            </footer>
          </>
        )}
      </div>

      {showAddPatient && (
        <AddPatientDialog
          onClose={() => setShowAddPatient(false)}
          onCreated={() => {
            setShowAddPatient(false);

            void loadDashboard();
          }}
        />
      )}
    </main>
  );
}

function DashboardSummary({
  dashboard,
}: {
  dashboard: NavigatorDashboardResponse;
}) {
  const { counts } = dashboard;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        icon={<AlertCircle />}
        label="Needs Attention"
        value={counts.needs_attention}
        description="Review or action needed"
      />

      <SummaryCard
        icon={<Clock3 />}
        label="Follow Up"
        value={counts.follow_up}
        description="Open coordination work"
      />

      <SummaryCard
        icon={<CheckCircle2 />}
        label="On Track"
        value={counts.on_track}
        description="No unresolved need"
      />

      <SummaryCard
        icon={<ClipboardList />}
        label="Active Tasks"
        value={counts.open_tasks + counts.in_progress_tasks}
        description={`${counts.open_tasks} open · ${counts.in_progress_tasks} in progress`}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;

  label: string;

  value: number;

  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-tint text-navy [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>

        <span className="text-3xl font-bold tracking-tight text-navy-deep">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-ink">{label}</p>

      <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
    </div>
  );
}

function PatientCard({
  patient,
}: {
  patient: NavigatorDashboardResponse["patients"][number];
}) {
  return (
    <Link
      href={`/navigator/patient/${patient.patient_id}`}
      className="block rounded-2xl border border-border bg-white p-5 transition hover:border-navy/25 hover:shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-tint text-sm font-bold text-navy">
            {getInitials(patient.first_name, patient.last_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink">
                {patient.first_name} {patient.last_name}
              </h3>

              <AttentionBadge status={patient.attention_status} />
            </div>

            <p className="mt-1 text-sm text-ink-soft">
              {patient.care_program ?? "Cancer Navigation"}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
              {patient.explanation}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-4 text-xs text-ink-soft sm:flex-col sm:items-end sm:gap-2">
          <span>
            {patient.open_need_count} open{" "}
            {patient.open_need_count === 1 ? "need" : "needs"}
          </span>

          {patient.next_appointment_at && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />

              {formatDateTime(patient.next_appointment_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AttentionBadge({ status }: { status: AttentionStatus }) {
  const styles: Record<AttentionStatus, string> = {
    needs_attention: "bg-priority-high-tint text-priority-high",

    follow_up: "bg-gold-tint text-navy-deep",

    on_track: "bg-priority-low-tint text-priority-low",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink-soft">
      {formatStatus(status)}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="mt-10 flex min-h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-navy" />

        <p className="mt-3 text-sm text-ink-soft">
          Loading navigator workspace...
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
          <p className="font-semibold text-ink">Unable to load the dashboard</p>

          <p className="mt-1 text-sm text-ink-soft">{message}</p>

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 text-center">
      <UsersRound className="mx-auto h-6 w-6 text-ink-soft" />

      <p className="mt-2 text-sm text-ink-soft">{message}</p>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
