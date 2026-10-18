"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CompassMark } from "@/components/app/CompassMark";
import { getHomeRouteForRole } from "@/lib/auth-routing";
import { useAuthStore } from "@/store/auth-store";

/*
 * Public home page.
 *
 * Tells the product through one patient's two days before a
 * treatment visit. Every step below is something the app
 * actually does.
 */

const STORY = [
  {
    when: "Tuesday, 10:00 AM",
    title: "Compass phones Mrs. Hebert",
    body: "Her chemotherapy is on Thursday. The call reminds her of the time and place in plain words. She can answer by voice or with the keypad, so she needs no app and no reading.",
  },
  {
    when: "Tuesday, 10:02 AM",
    title: "Her daughter answers for her",
    body: "Compass asks who is speaking before it shares any details. Her daughter says the usual ride fell through and her mother has been feeling worse, about a 7 out of 10.",
  },
  {
    when: "Tuesday, 10:03 AM",
    title: "The answers become a check-in",
    body: "No one types anything in. The transcript is saved, and the same rules that handle app check-ins flag the missing ride and the high symptom score.",
  },
  {
    when: "Tuesday, 10:15 AM",
    title: "Her navigator sees her first",
    body: "Mrs. Hebert moves to the top of the navigator's list with the reason written out. The navigator reads the call, books a ride and asks the nurse to phone her about the symptoms.",
  },
  {
    when: "Thursday, 9:00 AM",
    title: "She makes it to treatment",
    body: "The barrier was found two days early, not at the front desk on the day of the visit.",
  },
];

const ROLES = [
  {
    name: "Patients",
    body: "See the next visit, answer a few questions, and read care documents explained in plain language.",
  },
  {
    name: "Caregivers",
    body: "Help with rides, visits and check-ins. They see only what the patient has allowed.",
  },
  {
    name: "Navigators",
    body: "Start each day with a list sorted by who needs help, with the reason shown and a record of every call.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    router.replace(getHomeRouteForRole(user.role));
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-surface-soft text-ink-soft">
        <LoaderCircle className="h-5 w-5 animate-spin text-pine" />
        Opening Compass…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-soft text-ink">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-pine-deep">
            <CompassMark />
            <span className="text-lg font-bold">Compass</span>
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-pine px-4 py-2 font-semibold text-white hover:bg-pine-deep"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-14 pt-14 sm:px-8 sm:pt-20">
        <h1 className="max-w-3xl text-[2.4rem] font-bold leading-[1.1] text-pine-deep sm:text-[3.4rem]">
          Find out what could stop a patient from getting to treatment, while
          there is still time to fix it.
        </h1>

        <p className="mt-6 max-w-2xl text-[1.15rem] leading-8 text-ink-soft">
          Compass is a care navigation tool for people with cancer in rural and
          underserved communities. It phones patients before each visit, hears
          about problems like rides, medicine and costs, and puts that in front
          of the navigator who can help.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-pine px-6 py-3.5 text-[1.05rem] font-semibold text-white hover:bg-pine-deep"
          >
            Sign in to Compass
          </Link>
          <a
            href="#story"
            className="font-semibold text-pine underline underline-offset-4"
          >
            See how it works
          </a>
        </div>
      </section>

      <section id="story" className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[16rem_1fr]">
          <div>
            <h2 className="text-[1.6rem] font-bold leading-tight text-pine-deep">
              Two days before treatment
            </h2>
            <p className="mt-3 text-ink-soft">
              One patient, two days. Mrs. Hebert is a demo patient; every step
              is something Compass does today.
            </p>
          </div>

          <ol className="relative border-l-2 border-border">
            {STORY.map((step, index) => {
              const last = index === STORY.length - 1;
              return (
                <li key={step.title} className="relative pb-9 pl-8 last:pb-0">
                  <span
                    aria-hidden
                    className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 ${
                      last ? "border-pine bg-sun" : "border-pine bg-white"
                    }`}
                  />
                  <p className="text-sm font-semibold text-ochre">{step.when}</p>
                  <h3 className="mt-1 text-[1.2rem] font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-xl leading-7 text-ink-soft">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
        <h2 className="text-[1.6rem] font-bold text-pine-deep">
          One record, three kinds of people
        </h2>

        <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-3">
          {ROLES.map((role) => (
            <div key={role.name} className="border-t-2 border-pine pt-4">
              <dt className="text-[1.1rem] font-bold text-ink">{role.name}</dt>
              <dd className="mt-1.5 leading-7 text-ink-soft">{role.body}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-12 max-w-2xl border-l-4 border-sun pl-4 leading-7 text-ink">
          AI in Compass helps understand spoken answers, summarize documents
          and answer a navigator&apos;s questions about the record. It never
          decides who needs attention. Fixed, visible rules do that, and a
          person makes every care decision.
        </p>
      </section>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink-soft sm:px-8">
          Research prototype, Southeastern Louisiana University. All patient
          information shown is made up.
        </p>
      </footer>
    </main>
  );
}
