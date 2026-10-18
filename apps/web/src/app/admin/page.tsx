"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  Plus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { ApiError } from "@/lib/api";
import { createNavigator, getAdminNavigators } from "@/lib/admin-api";
import { useAuthStore } from "@/store/auth-store";

import type { AdminNavigator, NavigatorCreateRequest } from "@/types/admin";

const emptyForm: NavigatorCreateRequest = {
  email: "",
  first_name: "",
  last_name: "",
  job_title: "",
  department: "",
  phone: "",
};

export default function AdminPage() {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [navigators, setNavigators] = useState<AdminNavigator[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);

  const [form, setForm] = useState<NavigatorCreateRequest>(emptyForm);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          : "Unable to load administrator data.",
      );

      return false;
    },
    [logout, router],
  );

  const loadNavigators = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const data = await getAdminNavigators();

      setNavigators(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchNavigators() {
      try {
        const data = await getAdminNavigators();

        if (!cancelled) {
          setNavigators(data);
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

    void fetchNavigators();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError]);

  const activeCount = useMemo(
    () =>
      navigators.filter((navigator) => navigator.status === "active").length,
    [navigators],
  );

  const pendingCount = useMemo(
    () =>
      navigators.filter((navigator) => navigator.status === "pending").length,
    [navigators],
  );

  async function handleInvite(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setSuccessMessage(null);

    const payload: NavigatorCreateRequest = {
      email: form.email.trim().toLowerCase(),

      first_name: form.first_name.trim(),

      last_name: form.last_name.trim(),

      job_title: form.job_title.trim(),

      department: form.department?.trim() || null,

      phone: form.phone?.trim() || null,
    };

    if (
      !payload.email ||
      !payload.first_name ||
      !payload.last_name ||
      !payload.job_title
    ) {
      setSubmitError(
        "Email, first name, last name, and job title are required.",
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNavigator(payload);

      setSuccessMessage(result.message);

      setForm(emptyForm);

      setShowInvite(false);

      await loadNavigators();
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        logout();

        router.replace("/login");

        return;
      }

      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to invite navigator.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-pine-deep sm:text-4xl">
              Organization workspace
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              Manage navigator access for Compass Demo Health System.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitError(null);

              setSuccessMessage(null);

              setShowInvite(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep"
          >
            <Plus className="h-4 w-4" />
            Invite Navigator
          </button>
        </section>

        {successMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-priority-low-tint p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-priority-low" />

            <p className="text-sm font-medium text-priority-low">
              {successMessage}
            </p>
          </div>
        )}

        {isLoading && <LoadingState />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void loadNavigators()} />
        )}

        {!isLoading && !error && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <SummaryCard
                icon={<UsersRound />}
                label="Navigators"
                value={navigators.length}
                description="Organization accounts"
              />

              <SummaryCard
                icon={<CheckCircle2 />}
                label="Active"
                value={activeCount}
                description="Activated accounts"
              />

              <SummaryCard
                icon={<Clock3 />}
                label="Pending"
                value={pendingCount}
                description="Awaiting activation"
              />
            </section>

            <section className="mt-10">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Navigator administration
                </h2>

                <p className="mt-1 text-sm text-ink-soft">
                  Navigator accounts created within your organization.
                </p>
              </div>

              {navigators.length === 0 ? (
                <EmptyState onInvite={() => setShowInvite(true)} />
              ) : (
                <div className="mt-5 space-y-3">
                  {navigators.map((navigator) => (
                    <NavigatorCard
                      key={navigator.user_id}
                      navigator={navigator}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="mt-10 border-t border-border pt-5">
          <p className="text-xs leading-5 text-ink-soft">
            Compass administration controls account access. Patient
            prioritization and navigation decisions remain outside the
            administrator workspace.
          </p>
        </footer>
      </div>

      {showInvite && (
        <InviteNavigatorModal
          form={form}
          setForm={setForm}
          isSubmitting={isSubmitting}
          error={submitError}
          onClose={() => {
            if (isSubmitting) {
              return;
            }

            setShowInvite(false);

            setSubmitError(null);
          }}
          onSubmit={handleInvite}
        />
      )}
    </main>
  );
}

function NavigatorCard({ navigator }: { navigator: AdminNavigator }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-tint text-sm font-bold text-pine">
            {getInitials(navigator.first_name, navigator.last_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink">
                {navigator.first_name} {navigator.last_name}
              </h3>

              <StatusBadge status={navigator.status} />
            </div>

            <p className="mt-1 text-sm font-medium text-pine">
              {navigator.job_title}
            </p>

            {navigator.department && (
              <p className="mt-1 text-sm text-ink-soft">
                {navigator.department}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />

                {navigator.email}
              </span>

              {navigator.phone && <span>{navigator.phone}</span>}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-xs text-ink-soft sm:text-right">
          <p>Added {formatDate(navigator.created_at)}</p>

          <p className="mt-1">
            {navigator.last_login_at
              ? `Last login ${formatDate(navigator.last_login_at)}`
              : "No login yet"}
          </p>
        </div>
      </div>
    </article>
  );
}

function InviteNavigatorModal({
  form,
  setForm,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  form: NavigatorCreateRequest;

  setForm: React.Dispatch<React.SetStateAction<NavigatorCreateRequest>>;

  isSubmitting: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-deep/40 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="mt-1 text-xl font-bold text-pine-deep">
              Invite navigator
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Create a pending Compass navigator account and send an activation
              invitation.
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface-soft hover:text-pine disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="First name" required>
              <input
                type="text"
                required
                maxLength={100}
                disabled={isSubmitting}
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    first_name: event.target.value,
                  }))
                }
                className={inputClasses}
              />
            </FormField>

            <FormField label="Last name" required>
              <input
                type="text"
                required
                maxLength={100}
                disabled={isSubmitting}
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_name: event.target.value,
                  }))
                }
                className={inputClasses}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Email" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="navigator@example.com"
                  className={inputClasses}
                />
              </FormField>
            </div>

            <FormField label="Job title" required>
              <input
                type="text"
                required
                maxLength={150}
                disabled={isSubmitting}
                value={form.job_title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    job_title: event.target.value,
                  }))
                }
                placeholder="Cancer Navigator"
                className={inputClasses}
              />
            </FormField>

            <FormField label="Department">
              <input
                type="text"
                maxLength={150}
                disabled={isSubmitting}
                value={form.department ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    department: event.target.value,
                  }))
                }
                placeholder="Oncology Navigation"
                className={inputClasses}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Phone">
                <input
                  type="tel"
                  maxLength={30}
                  disabled={isSubmitting}
                  value={form.phone ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className={inputClasses}
                />
              </FormField>
            </div>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-priority-high-tint p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

              <p className="text-sm text-priority-high">{error}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-pine/30 hover:text-pine disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Invite Navigator
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;

  required?: boolean;

  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">
        {label}

        {required && <span className="text-priority-high"> *</span>}
      </span>

      <div className="mt-2">{children}</div>
    </label>
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

function StatusBadge({ status }: { status: AdminNavigator["status"] }) {
  const styles = {
    active: "bg-priority-low-tint text-priority-low",

    pending: "bg-sun-tint text-pine-deep",

    suspended: "bg-priority-high-tint text-priority-high",

    disabled: "bg-surface-soft text-ink-soft",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
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
          Loading administrator workspace...
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
            Unable to load administrator workspace
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

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-white px-6 py-12 text-center">
      <UserRound className="mx-auto h-7 w-7 text-ink-soft" />

      <p className="mt-3 font-semibold text-ink">No navigators yet</p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
        Invite the first navigator to begin building the Compass care navigation
        team.
      </p>

      <button
        type="button"
        onClick={onInvite}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep"
      >
        <Plus className="h-4 w-4" />
        Invite Navigator
      </button>
    </div>
  );
}

const inputClasses =
  "w-full rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70";

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
