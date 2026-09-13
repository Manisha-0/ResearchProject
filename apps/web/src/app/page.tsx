"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  LoaderCircle,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  useAuthStore,
} from "@/store/auth-store";

export default function HomePage() {
  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user,
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading,
  );

  const isAuthenticated =
    useAuthStore(
      (state) =>
        state.isAuthenticated,
    );

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !user
    ) {
      return;
    }

    router.replace(
      getHomeRoute(user.role),
    );
  }, [
    isAuthenticated,
    isLoading,
    router,
    user,
  ]);

  if (
    isLoading ||
    (isAuthenticated && user)
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-deep">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-gold" />

          <p className="mt-3 text-sm text-white/55">
            Opening Compass...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-deep text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold font-display text-lg font-bold text-navy-deep transition group-hover:scale-[1.03]">
              C
            </div>

            <div>
              <p className="font-display text-lg font-bold leading-none">
                Compass
              </p>

              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                Cancer Care Navigation
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 top-10 h-[500px] w-[500px] rounded-full border border-white/5" />

        <div className="pointer-events-none absolute -right-20 top-32 h-[320px] w-[320px] rounded-full border border-gold/10" />

        <div className="mx-auto grid max-w-7xl gap-16 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />

              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Navigation intelligence
              </span>
            </div>

            <h1 className="mt-7 max-w-2xl font-display text-5xl font-bold leading-[1.03] tracking-[-0.03em] sm:text-6xl lg:text-[4.4rem]">
              See what needs
              attention before it
              becomes another gap.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
              Compass brings together
              patient check-ins,
              caregiver updates, care
              milestones, and system
              signals so navigation
              teams can focus on the
              next human action.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3.5 text-sm font-bold text-navy-deep transition hover:bg-gold-soft"
              >
                Open Compass
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="text-xs leading-5 text-white/40">
                Built for patient,
                caregiver, and navigator
                coordination.
              </p>
            </div>
          </div>

          <WorkflowPreview />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-8 md:grid-cols-3">
            <ValueItem
              icon={<UserRound />}
              number="01"
              title="Patient signals"
              description="Daily barriers and requests enter the same navigation context as the care journey."
            />

            <ValueItem
              icon={
                <HeartHandshake />
              }
              number="02"
              title="Caregiver context"
              description="Authorized caregivers contribute information without receiving unrestricted patient access."
            />

            <ValueItem
              icon={<Route />}
              number="03"
              title="Navigator action"
              description="Signals become explainable navigation needs, tasks, and follow-up—not another score."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Designed around the
              navigator
            </p>

            <h2 className="mt-4 max-w-md font-display text-3xl font-bold leading-tight sm:text-4xl">
              AI can organize the
              information.
              <br />
              People still make the
              decisions.
            </h2>
          </div>

          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <Principle
              title="Explainable attention"
              description="Compass shows why a patient needs review instead of hiding workflow decisions behind an opaque risk score."
            />

            <Principle
              title="Permission-scoped access"
              description="Patients, caregivers, and navigators see only the information and actions appropriate to their role."
            />

            <Principle
              title="Signals stay connected"
              description="A patient check-in or caregiver update remains connected to the underlying care journey and navigation history."
            />

            <Principle
              title="Human resolution"
              description="Navigators review, coordinate, document, and resolve the work. AI supports the workflow rather than replacing it."
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-4 w-4 text-gold" />

            Prototype environment uses
            synthetic patient data only.
          </div>

          <p className="text-xs text-white/30">
            Project Compass
          </p>
        </div>
      </section>
    </main>
  );
}

function WorkflowPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-gold/[0.035] blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Navigator workspace
            </p>

            <p className="mt-1 text-sm font-semibold">
              Today&apos;s attention
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />

            <span className="text-[11px] font-semibold text-gold">
              Live context
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            <Metric
              value="4"
              label="Needs attention"
            />

            <Metric
              value="7"
              label="Follow up"
            />

            <Metric
              value="18"
              label="On track"
            />
          </div>

          <div className="mt-5 space-y-3">
            <WorkflowRow
              initials="MP"
              name="Marie Pruitt"
              reason="Transportation not confirmed before upcoming treatment"
              status="Needs attention"
              urgent
            />

            <WorkflowRow
              initials="EB"
              name="Elena Brooks"
              reason="Caregiver confirmed transportation"
              status="Updated"
            />

            <WorkflowRow
              initials="RG"
              name="Robert Guillory"
              reason="Medication access follow-up remains open"
              status="Follow up"
            />
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-navy-deep/45 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                <CheckCircle2 className="h-4 w-4 text-gold" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white/80">
                  From signal to action
                </p>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  Patient and caregiver
                  updates are
                  contextualized against
                  the care journey before
                  reaching the navigator
                  work queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-deep/35 p-3">
      <p className="font-display text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-white/40">
        {label}
      </p>
    </div>
  );
}

function WorkflowRow({
  initials,
  name,
  reason,
  status,
  urgent = false,
}: {
  initials: string;
  name: string;
  reason: string;
  status: string;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-deep/35 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {name}
            </p>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                urgent
                  ? "bg-gold text-navy-deep"
                  : "bg-white/10 text-white/60",
              ].join(" ")}
            >
              {status}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-white/40">
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}

function ValueItem({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="pt-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-gold">
          {icon}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
          {number}
        </p>

        <h2 className="mt-1 font-semibold">
          {title}
        </h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
          {description}
        </p>
      </div>
    </div>
  );
}

function Principle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l border-gold/35 pl-5">
      <h3 className="font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {description}
      </p>
    </div>
  );
}

function getHomeRoute(
  role:
    | "super_admin"
    | "navigator"
    | "patient"
    | "caregiver",
) {
  switch (role) {
    case "navigator":
      return "/navigator";

    case "patient":
      return "/patient";

    case "caregiver":
      return "/caregiver";

    case "super_admin":
    default:
      return "/";
  }
}