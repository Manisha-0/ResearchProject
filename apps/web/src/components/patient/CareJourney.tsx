import { Check, Circle, Clock3 } from "lucide-react";

import type { JourneyItem } from "@/lib/types";

export function CareJourney({ journey }: { journey: JourneyItem[] }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          My Care Journey
        </p>

        <h2 className="mt-1 text-xl font-semibold text-navy-deep">
          Where you are in treatment
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Compass keeps earlier milestones and what comes next in one timeline.
        </p>
      </div>

      <div className="mt-7">
        {journey.map((item, index) => (
          <div key={item.id} className="relative flex gap-4 pb-7 last:pb-0">
            {index !== journey.length - 1 && (
              <div className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border" />
            )}

            <JourneyIcon status={item.status} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>

                <span className="text-xs text-ink-soft">{item.date}</span>
              </div>

              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {item.detail}
              </p>

              {item.status === "current" && (
                <span className="mt-2 inline-flex rounded-full bg-gold-tint px-2.5 py-1 text-xs font-semibold text-navy-deep">
                  Current stage
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function JourneyIcon({
  status,
}: {
  status: "completed" | "current" | "upcoming";
}) {
  if (status === "completed") {
    return (
      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-priority-low-tint">
        <Check className="h-4 w-4 text-priority-low" />
      </div>
    );
  }

  if (status === "current") {
    return (
      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-tint">
        <Clock3 className="h-4 w-4 text-navy" />
      </div>
    );
  }

  return (
    <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft">
      <Circle className="h-4 w-4 text-ink-soft" />
    </div>
  );
}
