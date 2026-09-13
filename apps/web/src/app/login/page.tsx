"use client";

import { useState } from "react";
import {
  ArrowLeft,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getHomeRouteForRole } from "@/lib/auth-routing";
import { useAuthStore } from "@/store/auth-store";

type DemoAccount = "patient" | "caregiver" | "navigator";

const accounts: Record<
  DemoAccount,
  {
    email: string;
    password: string;
  }
> = {
  patient: {
    email: "manisha@compass.demo",
    password: "Demo123!",
  },

  caregiver: {
    email: "danielle@compass.demo",
    password: "Demo123!",
  },

  navigator: {
    email: "james@compass.demo",
    password: "Demo123!",
  },
};

export default function LoginPage() {
  const router = useRouter();

  const loginUser = useAuthStore(
    (state) => state.loginUser
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const storeError = useAuthStore(
    (state) => state.error
  );

  const clearError = useAuthStore(
    (state) => state.clearError
  );

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [demoLoading, setDemoLoading] =
    useState<DemoAccount | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearError();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    if (!password) {
      return;
    }

    try {
      const user = await loginUser(
        normalizedEmail,
        password
      );

      const destination =
        getHomeRouteForRole(user.role);

      router.replace(destination);
    } catch {
      // The auth store already exposes the
      // backend error through state.error.
    }
  }

  async function signInWithDemoAccount(
    role: DemoAccount
  ) {
    clearError();

    setDemoLoading(role);

    const account = accounts[role];

    setEmail(account.email);
    setPassword(account.password);

    try {
      const user = await loginUser(
        account.email,
        account.password
      );

      const destination =
        getHomeRouteForRole(user.role);

      router.replace(destination);
    } catch {
      // The auth store already exposes the
      // backend error through state.error.
    } finally {
      setDemoLoading(null);
    }
  }

  const formDisabled =
    isLoading || demoLoading !== null;

  return (
    <main className="min-h-screen bg-surface-soft">
      <div className="mx-auto max-w-md px-5 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Compass
        </Link>

        <div className="mt-10 rounded-2xl border border-border bg-white p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy">
            <LockKeyhole className="h-5 w-5 text-white" />
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold text-navy-deep">
            Sign in to Compass
          </h1>

          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Your workspace is determined by your authorized role and patient
            relationship.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <label
              htmlFor="email"
              className="text-sm font-semibold text-ink"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={formDisabled}
              onChange={(event) => {
                setEmail(event.target.value);

                if (storeError) {
                  clearError();
                }
              }}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-navy focus:ring-2 focus:ring-navy/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70"
            />

            <label
              htmlFor="password"
              className="mt-5 block text-sm font-semibold text-ink"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={formDisabled}
              onChange={(event) => {
                setPassword(event.target.value);

                if (storeError) {
                  clearError();
                }
              }}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-navy focus:ring-2 focus:ring-navy/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70"
            />

            {storeError && (
              <p
                role="alert"
                className="mt-3 text-sm text-priority-high"
              >
                {storeError}
              </p>
            )}

            <button
              type="submit"
              disabled={formDisabled}
              className="mt-6 w-full rounded-xl bg-navy px-5 py-3.5 font-semibold text-white transition hover:bg-navy-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && demoLoading === null
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Demo accounts
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Sign in using one of the synthetic Compass demo accounts.
            </p>

            <div className="mt-4 grid gap-3">
              <DemoButton
                icon={<UserRound />}
                title="Patient"
                description="Continue as Manisha"
                loading={
                  demoLoading === "patient"
                }
                disabled={formDisabled}
                onClick={() =>
                  signInWithDemoAccount(
                    "patient"
                  )
                }
              />

              <DemoButton
                icon={<HeartHandshake />}
                title="Caregiver"
                description="Continue as Danielle"
                loading={
                  demoLoading === "caregiver"
                }
                disabled={formDisabled}
                onClick={() =>
                  signInWithDemoAccount(
                    "caregiver"
                  )
                }
              />

              <DemoButton
                icon={<Stethoscope />}
                title="Navigator"
                description="Continue as James"
                loading={
                  demoLoading === "navigator"
                }
                disabled={formDisabled}
                onClick={() =>
                  signInWithDemoAccount(
                    "navigator"
                  )
                }
              />
            </div>

            <div className="mt-5 flex gap-2 rounded-xl bg-gold-tint p-3 text-xs leading-5 text-navy-deep">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Compass uses synthetic demo accounts. Authentication,
                role enforcement, patient assignments, and caregiver
                permissions are validated by the FastAPI backend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function DemoButton({
  icon,
  title,
  description,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface-soft p-4 text-left transition hover:border-navy/30 hover:bg-navy-tint/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-navy shadow-sm [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {title}
        </p>

        <p className="mt-1 text-xs text-ink-soft">
          {loading
            ? "Signing in..."
            : description}
        </p>
      </div>

      {!loading && (
        <span className="text-sm font-semibold text-navy opacity-0 transition group-hover:opacity-100">
          Enter →
        </span>
      )}
    </button>
  );
}