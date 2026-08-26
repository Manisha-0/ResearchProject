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
import { useCompassStore } from "@/store/compass-store";

type DemoAccount = "patient" | "caregiver" | "navigator";

const accounts = {
  patient: {
    email: "manisha@compass.demo",
    password: "demo123",
  },

  caregiver: {
    email: "danielle@compass.demo",
    password: "demo123",
  },

  navigator: {
    email: "james@compass.demo",
    password: "demo123",
  },
};

export default function LoginPage() {
  const router = useRouter();

  const signIn = useCompassStore((state) => state.signIn);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const result = signIn(email, password);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(result.redirectTo);
  }

  function signInWithDemoAccount(role: DemoAccount) {
    setError("");

    const account = accounts[role];

    const result = signIn(account.email, account.password);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(result.redirectTo);
  }

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

          <form onSubmit={handleSubmit} className="mt-7">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-navy focus:ring-2 focus:ring-navy/10"
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition placeholder:text-ink-soft/45 focus:border-navy focus:ring-2 focus:ring-navy/10"
            />

            {error && (
              <p className="mt-3 text-sm text-priority-high">{error}</p>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-navy px-5 py-3.5 font-semibold text-white transition hover:bg-navy-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Demo accounts
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              For the demo, enter any workspace instantly.
            </p>

            <div className="mt-4 grid gap-3">
              <DemoButton
                icon={<UserRound />}
                title="Patient"
                description="Continue as Manisha"
                onClick={() => signInWithDemoAccount("patient")}
              />

              <DemoButton
                icon={<HeartHandshake />}
                title="Caregiver"
                description="Continue as Danielle"
                onClick={() => signInWithDemoAccount("caregiver")}
              />

              <DemoButton
                icon={<Stethoscope />}
                title="Navigator"
                description="Continue as James"
                onClick={() => signInWithDemoAccount("navigator")}
              />
            </div>

            <div className="mt-5 flex gap-2 rounded-xl bg-gold-tint p-3 text-xs leading-5 text-navy-deep">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Demo authentication only. Production Compass would use
                health-system identity, secure sessions, and server-enforced
                role-based access.
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface-soft p-4 text-left transition hover:border-navy/30 hover:bg-navy-tint/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-navy shadow-sm [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>

        <p className="mt-1 text-xs text-ink-soft">{description}</p>
      </div>

      <span className="text-sm font-semibold text-navy opacity-0 transition group-hover:opacity-100">
        Enter →
      </span>
    </button>
  );
}
