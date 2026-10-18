"use client";

import type { SubmitEventHandler } from "react";

import { useState } from "react";

import { ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { getHomeRouteForRole } from "@/lib/auth-routing";

import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();

  const loginUser = useAuthStore((state) => state.loginUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const storeError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    clearError();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    if (!password) {
      return;
    }

    try {
      const user = await loginUser(normalizedEmail, password);

      const destination = getHomeRouteForRole(user.role);

      router.replace(destination);
    } catch {
      // The auth store already exposes
      // the backend error through
      // state.error.
    }
  };

  return (
    <main className="min-h-screen bg-surface-soft">
      <div className="mx-auto max-w-md px-5 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-pine"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Compass
        </Link>

        <div className="mt-10 rounded-2xl border border-border bg-white p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine">
            <LockKeyhole className="h-5 w-5 text-white" />
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold text-pine-deep">
            Sign in to Compass
          </h1>

          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Your workspace is determined by your authorized role and patient
            relationship.
          </p>

          <form onSubmit={handleSubmit} className="mt-7">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={isLoading}
              onChange={(event) => {
                setEmail(event.target.value);

                if (storeError) {
                  clearError();
                }
              }}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70"
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
              disabled={isLoading}
              onChange={(event) => {
                setPassword(event.target.value);

                if (storeError) {
                  clearError();
                }
              }}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70"
            />

            {storeError && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-priority-high-tint px-4 py-3"
              >
                <p className="text-sm text-priority-high">{storeError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3.5 font-semibold text-white transition hover:bg-pine-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-center text-xs leading-5 text-ink-soft">
              Access is limited to authorized Compass users.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-5 text-ink-soft">
          Compass is a care navigation prototype using synthetic demonstration
          data.
        </p>
      </div>
    </main>
  );
}
