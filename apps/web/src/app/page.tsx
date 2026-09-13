import Link from "next/link";

import {
  ArrowRight,
  HeartHandshake,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-navy-deep text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold font-bold text-navy-deep">
            C
          </div>

          <div>
            <p className="font-semibold">Compass</p>

            <p className="text-xs text-white/50">Cancer care navigation</p>
          </div>
        </div>

        <Link
          href="/login"
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-navy-tint"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Project Compass
          </p>

          <h1 className="mt-5 font-display text-5xl font-bold leading-tight sm:text-6xl">
            Help fewer patients
            <br />
            fall through the gaps.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65">
            Compass connects patient and caregiver signals with the care plan
            already managed by navigation teams — helping surface barriers
            earlier and organize the next human action.
          </p>

          <Link
            href="/login"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-semibold text-navy-deep transition hover:bg-gold-soft"
          >
            Open Compass
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Route />}
            title="One care journey"
            description="Appointments, milestones, documents, check-ins, and navigation barriers stay connected in one patient record."
          />

          <Feature
            icon={<Sparkles />}
            title="Less administrative work"
            description="Compass organizes outstanding follow-up and converts complex information into navigator and patient-friendly summaries."
          />

          <Feature
            icon={<HeartHandshake />}
            title="Human action"
            description="AI explains and organizes. Navigators and care teams remain responsible for decisions and intervention."
          />
        </div>

        <div className="mt-12 flex items-center gap-2 text-xs text-white/45">
          <ShieldCheck className="h-4 w-4 text-gold" />
          prototype uses synthetic patient data only.
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;

  title: string;

  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-gold">
        {icon}
      </div>

      <h2 className="mt-5 text-lg font-semibold">{title}</h2>

      <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
    </div>
  );
}
