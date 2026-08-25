import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

const roles = [
  {
    title: "Patient",
    name: "Maria Johnson",
    description: "See your care journey and complete today's check-in.",
    href: "/patient",
    icon: UserRound,
  },
  {
    title: "Caregiver",
    name: "Danielle Johnson",
    description:
      "Help coordinate appointments, transportation, and shared tasks.",
    href: "/caregiver",
    icon: HeartHandshake,
  },
  {
    title: "Navigator",
    name: "James Wilson",
    description: "See which patients may need navigation support today.",
    href: "/navigator",
    icon: Stethoscope,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-navy-deep">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-lg font-bold text-navy-deep">
              C
            </div>

            <div>
              <p className="font-semibold text-white">Compass</p>

              <p className="text-xs text-white/50">Cancer care navigation</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-white/55 sm:flex">
            <ShieldCheck className="h-4 w-4 text-gold" />
            Synthetic demo data
          </div>
        </header>

        <section className="mx-auto mt-20 max-w-3xl text-center sm:mt-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Project Compass
          </p>

          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            The right problem.
            <br />
            The right human.
            <br />
            The right time.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/65">
            Follow one synthetic cancer-care journey through the patient,
            caregiver, and navigator experience.
          </p>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <Link
                key={role.title}
                href={role.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:-translate-y-1 hover:border-gold/40 hover:bg-white/[0.09]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-5 w-5 text-gold" />
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gold">
                  {role.title}
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {role.name}
                </h2>

                <p className="mt-3 min-h-12 text-sm leading-6 text-white/55">
                  {role.description}
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white">
                  Enter experience
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </section>

        <footer className="mt-12 text-center">
          <p className="text-xs leading-5 text-white/40">
            Demo prototype · Synthetic patient records only · No clinical
            decisions are made by Compass.
          </p>
        </footer>
      </div>
    </main>
  );
}
