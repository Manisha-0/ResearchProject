"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LoaderCircle,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app/AppHeader";

import { ApiError } from "@/lib/api";

import { getNavigatorTasks } from "@/lib/navigator-api";

import { useAuthStore } from "@/store/auth-store";

import type {
  AttentionStatus,
  NavigationTaskStatus,
  NavigatorTaskQueueItem,
} from "@/types/navigator";

type TaskFilter = "active" | "open" | "in_progress" | "completed" | "all";

export default function NavigatorTasksPage() {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [tasks, setTasks] = useState<NavigatorTaskQueueItem[]>([]);

  const [filter, setFilter] = useState<TaskFilter>("active");

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
          : "Unable to load the navigator work queue.",
      );

      return false;
    },
    [logout, router],
  );

  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const data = await getNavigatorTasks();

      setTasks(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      try {
        const data = await getNavigatorTasks();

        if (!cancelled) {
          setTasks(data);
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

    void fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError]);

  const counts = useMemo(() => {
    const open = tasks.filter(({ task }) => task.status === "open").length;

    const inProgress = tasks.filter(
      ({ task }) => task.status === "in_progress",
    ).length;

    const completed = tasks.filter(
      ({ task }) => task.status === "completed",
    ).length;

    const activeTasks = tasks.filter(
      ({ task }) => task.status === "open" || task.status === "in_progress",
    );

    // Unticked checklist lines (a single-need task counts as one).
    const itemsLeft = activeTasks.reduce(
      (sum, { task }) =>
        sum +
        (task.items.length > 0
          ? task.items.filter((item) => !item.done).length
          : 1),
      0,
    );

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueToday = activeTasks.filter(
      ({ task }) => task.due_at && new Date(task.due_at) <= endOfToday,
    ).length;

    return {
      active: open + inProgress,

      itemsLeft,

      dueToday,

      open,

      inProgress,

      completed,

      all: tasks.length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (filter === "active") {
      return tasks.filter(
        ({ task }) => task.status === "open" || task.status === "in_progress",
      );
    }

    if (filter === "all") {
      return tasks;
    }

    return tasks.filter(({ task }) => task.status === filter);
  }, [filter, tasks]);

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-pine-deep sm:text-4xl">
              Coordination work across patients
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              Review active navigation work, follow progress, and revisit
              completed resolutions.
            </p>
          </div>

          <Link
            href="/navigator"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-pine transition hover:border-pine/30 hover:bg-pine-tint sm:self-auto"
          >
            Dashboard
          </Link>
        </section>

        {isLoading && <LoadingState />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void loadTasks()} />
        )}

        {!isLoading && !error && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={<ClipboardList />}
                label="Patients to follow up"
                value={counts.active}
                description="One open task per patient"
              />

              <SummaryCard
                icon={<Clock3 />}
                label="Due today"
                value={counts.dueToday}
                description="Including anything overdue"
              />

              <SummaryCard
                icon={<ClipboardCheck />}
                label="Items to cover"
                value={counts.itemsLeft}
                description="Checklist lines not ticked yet"
              />

              <SummaryCard
                icon={<CheckCircle2 />}
                label="Completed"
                value={counts.completed}
                description="Documented resolutions"
              />
            </section>

            <section className="mt-8">
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  <FilterButton
                    label="Active"
                    count={counts.active}
                    active={filter === "active"}
                    onClick={() => setFilter("active")}
                  />

                  <FilterButton
                    label="Completed"
                    count={counts.completed}
                    active={filter === "completed"}
                    onClick={() => setFilter("completed")}
                  />

                  <FilterButton
                    label="All"
                    count={counts.all}
                    active={filter === "all"}
                    onClick={() => setFilter("all")}
                  />
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {getFilterTitle(filter)}
                  </h2>

                  <p className="mt-1 text-sm text-ink-soft">
                    {visibleTasks.length}{" "}
                    {visibleTasks.length === 1 ? "task" : "tasks"}
                  </p>
                </div>
              </div>

              {visibleTasks.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                <div className="mt-5 space-y-4">
                  {visibleTasks.map((item) => (
                    <TaskCard key={item.task.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <footer className="mt-10 border-t border-border pt-5">
              <p className="text-xs leading-5 text-ink-soft">
                The Compass work queue represents navigation and coordination
                work. Attention status is not a clinical risk score.
              </p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

function TaskCard({ item }: { item: NavigatorTaskQueueItem }) {
  const {
    task,
    patient_first_name,
    patient_last_name,
    need_title,
    attention_status,
  } = item;

  const isCompleted = task.status === "completed";

  return (
    <article className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />

            <AttentionBadge status={attention_status} />
          </div>

          <h3 className="mt-4 text-base font-semibold text-ink">
            {task.title}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <UserRound className="h-4 w-4 shrink-0 text-pine" />

            <span>
              {patient_first_name} {patient_last_name}
            </span>
          </div>

          {task.kind === "follow_up" && task.items.length > 0 ? (
            <div className="mt-4 rounded-xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold text-ink-soft">
                Checklist · {task.items.filter((line) => line.done).length} of{" "}
                {task.items.length} done
              </p>

              <ul className="mt-2 space-y-1.5">
                {task.items.map((line) => (
                  <li
                    key={line.item_id}
                    className="flex items-start gap-2 text-sm"
                  >
                    {line.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-priority-low" />
                    ) : (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ink-soft/50 bg-white" />
                    )}

                    <span
                      className={
                        line.done ? "text-ink-soft line-through" : "text-ink"
                      }
                    >
                      {line.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold text-ink-soft">
                Navigation need
              </p>

              <p className="mt-1.5 text-sm font-semibold text-ink">
                {need_title}
              </p>

              {task.description && (
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {task.description}
                </p>
              )}
            </div>
          )}

          {isCompleted && task.resolution_note && (
            <div className="mt-4 rounded-xl bg-priority-low-tint p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-priority-low" />

                <p className="text-xs font-semibold text-priority-low">
                  Resolution
                </p>
              </div>

              <p className="mt-2 text-sm leading-6 text-ink">
                {task.resolution_note}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
            {task.due_at && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Due {formatDateTime(task.due_at)}
              </span>
            )}

            {task.completed_at && (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed {formatDateTime(task.completed_at)}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <Link
            href={`/navigator/patient/${task.patient_id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep"
          >
            {isCompleted ? "View Patient" : "Open Patient"}

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-tint text-pine [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>

        <span className="text-3xl font-bold tracking-tight text-pine-deep">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-ink">{label}</p>

      <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-pine/30 hover:text-pine"
      }
    >
      {label}

      <span
        className={
          active
            ? "rounded-full bg-white/15 px-2 py-0.5 text-xs text-white"
            : "rounded-full bg-surface-soft px-2 py-0.5 text-xs text-ink-soft"
        }
      >
        {count}
      </span>
    </button>
  );
}

function TaskStatusBadge({ status }: { status: NavigationTaskStatus }) {
  const styles: Record<NavigationTaskStatus, string> = {
    open: "bg-surface-soft text-ink-soft",

    in_progress: "bg-sun-tint text-pine-deep",

    completed: "bg-priority-low-tint text-priority-low",

    cancelled: "bg-surface-soft text-ink-soft",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function AttentionBadge({ status }: { status: AttentionStatus }) {
  const styles: Record<AttentionStatus, string> = {
    needs_attention: "bg-priority-high-tint text-priority-high",

    follow_up: "bg-sun-tint text-pine-deep",

    on_track: "bg-priority-low-tint text-priority-low",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ filter }: { filter: TaskFilter }) {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-white px-6 py-12 text-center">
      <ClipboardCheck className="mx-auto h-7 w-7 text-ink-soft" />

      <p className="mt-3 font-semibold text-ink">
        No {getFilterTitle(filter).toLowerCase()}
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
        Navigation tasks matching this view will appear here as work is created
        and completed.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-10 flex min-h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-pine" />

        <p className="mt-3 text-sm text-ink-soft">
          Loading navigator work queue...
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
            Unable to load the work queue
          </p>

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

function getFilterTitle(filter: TaskFilter) {
  const labels: Record<TaskFilter, string> = {
    active: "Active tasks",

    open: "Open tasks",

    in_progress: "Tasks in progress",

    completed: "Completed tasks",

    all: "All tasks",
  };

  return labels[filter];
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
