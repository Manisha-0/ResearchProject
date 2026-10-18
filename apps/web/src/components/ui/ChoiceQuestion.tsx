"use client";

import { Check } from "lucide-react";

export type ChoiceOption = {
  label: string;
  active: boolean;
  onClick: () => void;
};

/**
 * A question answered by tapping one large button.
 * Used by both the patient and caregiver check-ins.
 * The selected answer shows a check mark as well as
 * a color change, so it does not rely on color alone.
 */
export function ChoiceQuestion({
  title,
  options,
}: {
  title: string;
  options: ChoiceOption[];
}) {
  return (
    <fieldset>
      <legend className="text-[1.1rem] font-semibold text-ink">{title}</legend>

      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.active}
            onClick={option.onClick}
            className={[
              "inline-flex min-h-12 items-center gap-2 rounded-lg border-2 px-5 text-[1.05rem] font-semibold transition-colors",
              option.active
                ? "border-pine bg-pine text-white"
                : "border-border bg-white text-ink hover:border-pine-soft",
            ].join(" ")}
          >
            {option.active && (
              <Check aria-hidden className="h-5 w-5" strokeWidth={3} />
            )}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
