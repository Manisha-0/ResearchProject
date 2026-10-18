"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
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
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold leading-tight text-pine-deep">
              My patients
            </h1>
            <p className="mt-1 text-ink-soft">
              {getGreeting()}. Patients who need you most are at the top.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPatient(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 font-semibold text-white transition-colors hover:bg-pine-deep"
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
            <DashboardSummary dashboard={dashboard} />

            <section className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-lg font-bold text-ink">
                  Assigned to you
                </h2>
              </div>

              {dashboard.patients.length === 0 ? (
                <div className="mt-3">
                  <EmptyState message="No patients are assigned to you yet. Add a patient to get started." />
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-white">
                  {dashboard.patients.map((patient) => (
                    <PatientCard key={patient.patient_id} patient={patient} />
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Open tasks
                  </h2>

                  <p className="mt-1 text-sm text-ink-soft">
                    Open coordination work across your assigned patients.
                  </p>
                </div>

                <Link
                  href="/navigator/tasks"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-pine transition hover:text-pine-deep"
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
                      className="block rounded-2xl border border-border bg-white p-5 transition hover:border-pine/25 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-pine" />

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
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-pine transition hover:border-pine/30 hover:bg-pine-tint"
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

const STATUS_STRIPE: Record<AttentionStatus, string> = {
  needs_attention: "bg-priority-high",
  follow_up: "bg-priority-medium",
  on_track: "bg-priority-low",
};

function DashboardSummary({
  dashboard,
}: {
  dashboard: NavigatorDashboardResponse;
}) {
  const { counts } = dashboard;
  const total = Math.max(counts.total_patients, 1);
  const tasks = counts.open_tasks + counts.in_progress_tasks;

  const parts: { status: AttentionStatus; value: number; label: string }[] = [
    { status: "needs_attention", value: counts.needs_attention, label: "need attention" },
    { status: "follow_up", value: counts.follow_up, label: "to follow up" },
    { status: "on_track", value: counts.on_track, label: "on track" },
  ];

  return (
    <section aria-label="Summary" className="mt-8">
      <p className="text-[1.05rem] text-ink">
        {parts.map((part, index) => (
          <span key={part.status}>
            {index > 0 && ", "}
            <strong className="font-bold">{part.value}</strong> {part.label}
          </span>
        ))}
        . <strong className="font-bold">{tasks}</strong>{" "}
        {tasks === 1 ? "task" : "tasks"} open.
      </p>

      <div
        aria-hidden
        className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-border"
      >
        {parts.map((part) =>
          part.value > 0 ? (
            <div
              key={part.status}
              className={STATUS_STRIPE[part.status]}
              style={{ width: `${(part.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
    </section>
  );
}

function PatientCard({
  patient,
}: {
  patient: NavigatorDashboardResponse["patients"][number];
}) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${STATUS_STRIPE[patient.attention_status]}`}
      />
      <Link
        href={`/navigator/patient/${patient.patient_id}`}
        className="grid gap-2 py-4 pl-6 pr-5 transition-colors hover:bg-surface-soft/70 md:grid-cols-[1fr_12rem] md:gap-6"
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-ink">
              {patient.first_name} {patient.last_name}
            </span>
            <AttentionBadge status={patient.attention_status} />
          </p>

          <p className="mt-1 max-w-3xl text-[0.95rem] leading-6 text-ink-soft">
            {patient.explanation}
          </p>
        </div>

        <div className="text-sm text-ink-soft md:text-right">
          {patient.next_appointment_at ? (
            <p className="inline-flex items-center gap-1.5 md:justify-end">
              <CalendarDays className="h-4 w-4" />
              {formatDateTime(patient.next_appointment_at)}
            </p>
          ) : (
            <p>No visit booked</p>
          )}
          <p>
            {patient.open_need_count} open{" "}
            {patient.open_need_count === 1 ? "need" : "needs"}
          </p>
        </div>
      </Link>
    </li>
  );
}

function AttentionBadge({ status }: { status: AttentionStatus }) {
  const styles: Record<AttentionStatus, string> = {
    needs_attention: "bg-priority-high-tint text-priority-high",

    follow_up: "bg-priority-medium-tint text-priority-medium",

    on_track: "bg-priority-low-tint text-priority-low",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${styles[status]}`}
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
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-pine" />

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
            className="mt-4 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-deep"
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
