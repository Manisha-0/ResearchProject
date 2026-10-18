import {
  Ban,
  Check,
  Circle,
  Clock3,
} from "lucide-react";

import type {
  JourneyItemStatus,
  PatientJourneyItem,
} from "@/types/patient";

export function CareJourney({
  journey,
}: {
  journey: PatientJourneyItem[];
}) {
  const orderedJourney = [
    ...journey,
  ].sort(compareJourneyItems);

  return (
    <section className="border-t border-border pt-8">
      <div>
        <h2 className="text-[1.5rem] font-bold leading-tight text-pine-deep">
          Where you are in treatment
        </h2>

        <p className="mt-2 text-base leading-6 text-ink-soft">
          Compass keeps earlier milestones
          and what comes next in one
          timeline.
        </p>
      </div>

      <div className="mt-7">
        {orderedJourney.length === 0 ? (
          <p className="text-base text-ink-soft">
            No care journey items are
            available yet.
          </p>
        ) : (
          orderedJourney.map(
            (item, index) => (
              <div
                key={item.id}
                className="relative flex gap-4 pb-7 last:pb-0"
              >
                {index !==
                  orderedJourney.length -
                    1 && (
                  <div className="absolute left-3.75 top-8 h-[calc(100%-1rem)] w-px bg-border" />
                )}

                <JourneyIcon
                  status={item.status}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-ink">
                      {item.title}
                    </h3>

                    <span className="text-sm text-ink-soft">
                      {formatJourneyDate(
                        item,
                      )}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-1 text-base leading-6 text-ink-soft">
                      {
                        item.description
                      }
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-surface-soft px-2.5 py-1 text-sm font-medium text-ink-soft">
                      {formatStatus(
                        item.item_type,
                      )}
                    </span>

                    {item.status ===
                      "in_progress" && (
                      <span className="inline-flex rounded-full bg-sun-tint px-2.5 py-1 text-sm font-semibold text-pine-deep">
                        Current stage
                      </span>
                    )}

                    {item.status ===
                      "cancelled" && (
                      <span className="inline-flex rounded-full bg-priority-high-tint px-2.5 py-1 text-sm font-semibold text-priority-high">
                        Cancelled
                      </span>
                    )}
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

function JourneyIcon({
  status,
}: {
  status: JourneyItemStatus;
}) {
  if (status === "completed") {
    return (
      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-priority-low-tint">
        <Check className="h-4 w-4 text-priority-low" />
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-tint">
        <Clock3 className="h-4 w-4 text-pine" />
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-priority-high-tint">
        <Ban className="h-4 w-4 text-priority-high" />
      </div>
    );
  }

  return (
    <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft">
      <Circle className="h-4 w-4 text-ink-soft" />
    </div>
  );
}

function compareJourneyItems(
  first: PatientJourneyItem,
  second: PatientJourneyItem,
) {
  const firstDate =
    getJourneyDate(first);

  const secondDate =
    getJourneyDate(second);

  if (!firstDate && !secondDate) {
    return 0;
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return (
    firstDate.getTime() -
    secondDate.getTime()
  );
}

function getJourneyDate(
  item: PatientJourneyItem,
) {
  const value =
    item.scheduled_at ??
    item.completed_at ??
    item.appointment
      ?.scheduled_start;

  return value
    ? new Date(value)
    : null;
}

function formatJourneyDate(
  item: PatientJourneyItem,
) {
  const date =
    getJourneyDate(item);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(date);
}

function formatStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}