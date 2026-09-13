"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HeartHandshake,
  LoaderCircle,
  Mail,
  Phone,
  Play,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AppHeader,
} from "@/components/app/AppHeader";
import {
  ApiError,
} from "@/lib/api";
import {
  createNavigationTask,
  getPatient360,
  updateNavigationTask,
} from "@/lib/navigator-api";
import {
  useAuthStore,
} from "@/store/auth-store";

import type {
  AttentionStatus,
  NavigationTaskStatus,
  Patient360CheckIn,
  Patient360Need,
  Patient360Resolution,
  Patient360Response,
  Patient360Task,
} from "@/types/navigator";

export default function PatientDetailPage() {
  const params =
    useParams<{ id: string }>();

  const router = useRouter();

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const [
    patient,
    setPatient,
  ] =
    useState<
      Patient360Response | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  const [
    creatingNeedId,
    setCreatingNeedId,
  ] =
    useState<string | null>(null);

  const [
    updatingTaskId,
    setUpdatingTaskId,
  ] =
    useState<string | null>(null);

  const [
    completingTask,
    setCompletingTask,
  ] =
    useState<Patient360Task | null>(
      null,
    );

  const [
    resolutionNote,
    setResolutionNote,
  ] =
    useState("");

  const [
    completionError,
    setCompletionError,
  ] =
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

          router.replace(
            "/login",
          );

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

  const loadPatient =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await getPatient360(
            params.id,
          );

        setPatient(data);
      } catch (caughtError) {
        handleRequestError(
          caughtError,
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      handleRequestError,
      params.id,
    ]);

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

    void fetchPatient();

    return () => {
      cancelled = true;
    };
  }, [
    handleRequestError,
    params.id,
  ]);

  async function handleCreateTask(
    need: Patient360Need,
  ) {
    if (!patient) {
      return;
    }

    setCreatingNeedId(
      need.need_id,
    );

    setError(null);

    try {
      await createNavigationTask(
        patient.profile.patient_id,
        need.need_id,
        {},
      );

      await loadPatient();
    } catch (caughtError) {
      handleRequestError(
        caughtError,
      );
    } finally {
      setCreatingNeedId(
        null,
      );
    }
  }

  async function handleStartTask(
    task: Patient360Task,
  ) {
    if (!patient) {
      return;
    }

    setUpdatingTaskId(
      task.task_id,
    );

    setError(null);

    try {
      await updateNavigationTask(
        patient.profile.patient_id,
        task.task_id,
        {
          status:
            "in_progress",
        },
      );

      await loadPatient();
    } catch (caughtError) {
      handleRequestError(
        caughtError,
      );
    } finally {
      setUpdatingTaskId(
        null,
      );
    }
  }

  function openCompletion(
    task: Patient360Task,
  ) {
    setCompletingTask(task);

    setResolutionNote("");

    setCompletionError(null);
  }

  function closeCompletion() {
    if (updatingTaskId) {
      return;
    }

    setCompletingTask(null);

    setResolutionNote("");

    setCompletionError(null);
  }

  async function handleCompleteTask() {
    if (
      !patient ||
      !completingTask
    ) {
      return;
    }

    const trimmedNote =
      resolutionNote.trim();

    if (!trimmedNote) {
      setCompletionError(
        "Add a resolution note before completing the task.",
      );

      return;
    }

    setUpdatingTaskId(
      completingTask.task_id,
    );

    setCompletionError(null);
    setError(null);

    try {
      await updateNavigationTask(
        patient.profile.patient_id,
        completingTask.task_id,
        {
          status:
            "completed",

          resolution_note:
            trimmedNote,
        },
      );

      setCompletingTask(null);

      setResolutionNote("");

      await loadPatient();
    } catch (caughtError) {
      if (
        caughtError instanceof
          ApiError &&
        caughtError.status === 401
      ) {
        handleRequestError(
          caughtError,
        );

        return;
      }

      setCompletionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete the task.",
      );
    } finally {
      setUpdatingTaskId(
        null,
      );
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

        {isLoading && (
          <LoadingState />
        )}

        {!isLoading &&
          error &&
          !patient && (
            <ErrorState
              message={error}
              onRetry={() =>
                void loadPatient()
              }
            />
          )}

        {!isLoading &&
          patient && (
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
                    patient={
                      patient
                    }
                  />

                  <NavigationNeeds
                    needs={
                      patient.open_needs
                    }
                    activeTasks={
                      patient.active_tasks
                    }
                    creatingNeedId={
                      creatingNeedId
                    }
                    onCreateTask={
                      handleCreateTask
                    }
                  />

                  <RecentCheckIns
                    patient={
                      patient
                    }
                  />

                  <Caregivers
                    patient={
                      patient
                    }
                  />
                </div>

                <aside className="space-y-6">
                  <UpcomingAppointments
                    patient={
                      patient
                    }
                  />

                  <ActiveTasks
                    patient={
                      patient
                    }
                    updatingTaskId={
                      updatingTaskId
                    }
                    onStart={
                      handleStartTask
                    }
                    onComplete={
                      openCompletion
                    }
                  />

                  <RecentResolutions
                    resolutions={
                      patient.recent_resolutions
                    }
                  />
                </aside>
              </div>

              <footer className="mt-10 border-t border-border pt-5">
                <p className="text-xs leading-5 text-ink-soft">
                  Compass uses synthetic
                  demo data. Attention
                  status reflects
                  navigation workflow
                  needs and does not
                  represent clinical
                  risk or replace
                  care-team judgment.
                </p>
              </footer>
            </>
          )}
      </div>

      {completingTask && (
        <CompleteTaskDialog
          task={
            completingTask
          }
          resolutionNote={
            resolutionNote
          }
          error={
            completionError
          }
          isSubmitting={
            updatingTaskId ===
            completingTask.task_id
          }
          onResolutionNoteChange={
            setResolutionNote
          }
          onClose={
            closeCompletion
          }
          onSubmit={() =>
            void handleCompleteTask()
          }
        />
      )}
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
          icon={
            <ShieldCheck />
          }
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
            What requires
            navigation review
          </h2>
        </div>

        <AttentionBadge
          status={
            patient.attention.status
          }
        />
      </div>

      <p className="mt-5 text-sm leading-7 text-ink-soft">
        {
          patient.attention
            .explanation
        }
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
  activeTasks,
  creatingNeedId,
  onCreateTask,
}: {
  needs: Patient360Need[];

  activeTasks: Patient360Task[];

  creatingNeedId:
    | string
    | null;

  onCreateTask: (
    need: Patient360Need,
  ) => Promise<void>;
}) {
  const taskByNeed =
    useMemo(() => {
      return new Map(
        activeTasks.map(
          (task) => [
            task.navigation_need_id,
            task,
          ],
        ),
      );
    }, [activeTasks]);

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        Navigation Needs
      </p>

      <h2 className="mt-1 text-lg font-semibold text-ink">
        Why intervention may be
        needed
      </h2>

      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Convert an open navigation
        need into trackable navigator
        work.
      </p>

      <div className="mt-5 space-y-4">
        {needs.length === 0 ? (
          <div className="rounded-xl bg-priority-low-tint p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-priority-low" />

              <p className="text-sm font-medium text-priority-low">
                No open navigation
                needs.
              </p>
            </div>
          </div>
        ) : (
          needs.map((need) => {
            const activeTask =
              taskByNeed.get(
                need.need_id,
              );

            return (
              <div
                key={
                  need.need_id
                }
                className="rounded-xl border border-border bg-surface-soft p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {
                          need.title
                        }
                      </p>

                      <AttentionBadge
                        status={
                          need.attention_status
                        }
                      />
                    </div>

                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {
                        need.explanation
                      }
                    </p>

                    {need.recommended_action && (
                      <div className="mt-3 rounded-lg bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                          Recommended
                          action
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

                  {activeTask ? (
                    <div className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy">
                      Task{" "}
                      {formatStatus(
                        activeTask.status,
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        creatingNeedId ===
                        need.need_id
                      }
                      onClick={() =>
                        void onCreateTask(
                          need,
                        )
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingNeedId ===
                      need.need_id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}

                      {creatingNeedId ===
                      need.need_id
                        ? "Creating..."
                        : "Create task"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function ActiveTasks({
  patient,
  updatingTaskId,
  onStart,
  onComplete,
}: {
  patient: Patient360Response;

  updatingTaskId:
    | string
    | null;

  onStart: (
    task: Patient360Task,
  ) => Promise<void>;

  onComplete: (
    task: Patient360Task,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-5 w-5 text-navy" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Navigator Work
          </p>

          <h2 className="mt-1 font-semibold text-ink">
            Active tasks
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {patient.active_tasks.length ===
        0 ? (
          <p className="text-sm leading-6 text-ink-soft">
            No active navigation
            tasks. Create one from an
            open navigation need.
          </p>
        ) : (
          patient.active_tasks.map(
            (task) => {
              const isUpdating =
                updatingTaskId ===
                task.task_id;

              return (
                <div
                  key={
                    task.task_id
                  }
                  className="rounded-xl bg-surface-soft p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                      {
                        task.title
                      }
                    </p>

                    <TaskStatusBadge
                      status={
                        task.status
                      }
                    />
                  </div>

                  {task.description && (
                    <p className="mt-2 text-xs leading-5 text-ink-soft">
                      {
                        task.description
                      }
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    {task.status ===
                      "open" && (
                      <button
                        type="button"
                        disabled={
                          isUpdating
                        }
                        onClick={() =>
                          void onStart(
                            task,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}

                        Start task
                      </button>
                    )}

                    {(task.status ===
                      "open" ||
                      task.status ===
                        "in_progress") && (
                      <button
                        type="button"
                        disabled={
                          isUpdating
                        }
                        onClick={() =>
                          onComplete(
                            task,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            },
          )
        )}
      </div>
    </section>
  );
}

function RecentResolutions({
  resolutions,
}: {
  resolutions:
    Patient360Resolution[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-priority-low" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Resolution History
          </p>

          <h2 className="mt-1 font-semibold text-ink">
            Recently completed work
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {resolutions.length ===
        0 ? (
          <p className="text-sm leading-6 text-ink-soft">
            No completed navigation
            work is recorded yet.
          </p>
        ) : (
          resolutions.map(
            (resolution) => (
              <div
                key={
                  resolution.task_id
                }
                className="rounded-xl border border-border bg-surface-soft p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-priority-low-tint">
                    <CheckCircle2 className="h-4 w-4 text-priority-low" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {
                            resolution.need_title
                          }
                        </p>

                        <p className="mt-1 text-xs text-ink-soft">
                          Task:{" "}
                          {
                            resolution.task_title
                          }
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-priority-low-tint px-2.5 py-1 text-[11px] font-semibold text-priority-low">
                        Resolved
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                        Resolution note
                      </p>

                      <p className="mt-1.5 text-sm leading-6 text-ink">
                        {
                          resolution.resolution_note
                        }
                      </p>
                    </div>

                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                      <Clock3 className="h-3.5 w-3.5" />

                      Completed{" "}
                      {formatDateTime(
                        resolution.completed_at,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}

function CompleteTaskDialog({
  task,
  resolutionNote,
  error,
  isSubmitting,
  onResolutionNoteChange,
  onClose,
  onSubmit,
}: {
  task: Patient360Task;

  resolutionNote: string;

  error: string | null;

  isSubmitting: boolean;

  onResolutionNoteChange: (
    value: string,
  ) => void;

  onClose: () => void;

  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Complete task
            </p>

            <h2 className="mt-1 text-lg font-semibold text-ink">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-ink-soft">
            Document what was done
            before closing this
            navigation work. Completing
            the task will resolve its
            linked navigation need.
          </p>

          <label
            htmlFor="resolution-note"
            className="mt-5 block text-sm font-semibold text-ink"
          >
            Resolution note
          </label>

          <textarea
            id="resolution-note"
            value={
              resolutionNote
            }
            disabled={
              isSubmitting
            }
            onChange={(event) =>
              onResolutionNoteChange(
                event.target.value,
              )
            }
            rows={5}
            maxLength={3000}
            placeholder="Example: Spoke with patient and confirmed transportation through caregiver for the upcoming appointment."
            className="mt-2 w-full resize-none rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-navy focus:bg-white disabled:opacity-60"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">
              Required to complete
              the task.
            </p>

            <p className="text-xs text-ink-soft">
              {
                resolutionNote.length
              }
              /3000
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-priority-high-tint p-3 text-sm text-priority-high">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={
                isSubmitting
              }
              onClick={
                onClose
              }
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                isSubmitting
              }
              onClick={
                onSubmit
              }
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}

              {isSubmitting
                ? "Completing..."
                : "Complete task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentCheckIns({
  patient,
}: {
  patient: Patient360Response;
}) {
  const recentCheckIns =
    patient.recent_check_ins.slice(
      0,
      5,
    );

  if (
    recentCheckIns.length ===
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
            Patient and caregiver
            signals
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {recentCheckIns.map(
          (checkIn) =>
            isTransportationOnlyUpdate(
              checkIn,
            ) ? (
              <TransportationUpdate
                key={
                  checkIn.check_in_id
                }
                checkIn={
                  checkIn
                }
              />
            ) : (
              <FullCheckIn
                key={
                  checkIn.check_in_id
                }
                checkIn={
                  checkIn
                }
              />
            ),
        )}
      </div>

      {patient.recent_check_ins
        .length > 5 && (
        <p className="mt-4 text-xs text-ink-soft">
          Showing the five most
          recent check-ins.
        </p>
      )}
    </section>
  );
}

function TransportationUpdate({
  checkIn,
}: {
  checkIn: Patient360CheckIn;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          Caregiver update
        </p>

        <p className="text-xs text-ink-soft">
          {formatDateTime(
            checkIn.created_at,
          )}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-priority-low">
        <CheckCircle2 className="h-4 w-4" />
        Transportation confirmed
      </div>

      {checkIn.free_text && (
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {checkIn.free_text}
        </p>
      )}
    </div>
  );
}

function FullCheckIn({
  checkIn,
}: {
  checkIn: Patient360CheckIn;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-4">
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
            No caregiver relationship
            is currently available.
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

                <div className="mt-3 flex flex-wrap gap-2">
                  {caregiver.permissions.map(
                    (
                      permission,
                    ) => (
                      <span
                        key={
                          permission
                        }
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
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6  lg:top-24">
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
            No upcoming
            appointments.
          </p>
        ) : (
          patient.upcoming_appointments.map(
            (
              appointment,
            ) => (
              <div
                key={
                  appointment.appointment_id
                }
                className="rounded-xl bg-surface-soft p-4"
              >
                <p className="text-sm font-semibold text-ink">
                  {
                    appointment.title
                  }
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

function TaskStatusBadge({
  status,
}: {
  status: NavigationTaskStatus;
}) {
  const styles: Record<
    NavigationTaskStatus,
    string
  > = {
    open:
      "bg-white text-ink-soft",

    in_progress:
      "bg-gold-tint text-navy-deep",

    completed:
      "bg-priority-low-tint text-priority-low",

    cancelled:
      "bg-surface-soft text-ink-soft",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
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

        <p className="mt-1 wrap-break-word text-sm font-semibold text-ink">
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
            Unable to load Patient
            360
          </p>

          <p className="mt-1 text-sm text-ink-soft">
            {message}
          </p>

          <button
            type="button"
            onClick={
              onRetry
            }
            className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function isTransportationOnlyUpdate(
  checkIn: Patient360CheckIn,
) {
  return (
    checkIn.source ===
      "caregiver" &&
    checkIn.transportation_confirmed ===
      true &&
    checkIn.symptom_severity ===
      null &&
    !checkIn.medication_access_issue &&
    !checkIn.financial_concern &&
    !checkIn.requested_help
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

  const today =
    new Date();

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
    .replace(
      /\b\w/g,
      (letter) =>
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
  ).format(
    new Date(value),
  );
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