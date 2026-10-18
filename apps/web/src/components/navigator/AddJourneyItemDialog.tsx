"use client";

import { AlertCircle, CalendarPlus, LoaderCircle, X } from "lucide-react";

import { useState } from "react";

import { createJourneyItem } from "@/lib/navigator-api";

import type { JourneyItemType } from "@/types/navigator";

type AddJourneyItemDialogProps = {
  patientId: string;

  onClose: () => void;

  onCreated: () => void;
};

type SupportedJourneyItemType =
  | "treatment"
  | "referral"
  | "follow_up"
  | "care_task"
  | "milestone";

const journeyTypes: Array<{
  value: SupportedJourneyItemType;

  label: string;

  description: string;
}> = [
  {
    value: "treatment",

    label: "Treatment",

    description: "Treatment session or therapy event.",
  },

  {
    value: "referral",

    label: "Referral",

    description: "Referral to another service or specialist.",
  },

  {
    value: "follow_up",

    label: "Follow Up",

    description: "Follow-up activity or planned review.",
  },

  {
    value: "care_task",

    label: "Care Task",

    description: "Patient-facing care journey task.",
  },

  {
    value: "milestone",

    label: "Milestone",

    description: "Important point in the care journey.",
  },
];

export function AddJourneyItemDialog({
  patientId,
  onClose,
  onCreated,
}: AddJourneyItemDialogProps) {
  const [itemType, setItemType] =
    useState<SupportedJourneyItemType>("treatment");

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [scheduledAt, setScheduledAt] = useState("");

  const [patientVisible, setPatientVisible] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");

      return;
    }

    setIsSubmitting(true);

    setError(null);

    try {
      await createJourneyItem(patientId, {
        item_type: itemType as JourneyItemType,

        title: title.trim(),

        description: description.trim() ? description.trim() : null,

        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,

        patient_visible: patientVisible,
      });

      onCreated();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add the care journey item.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-deep/55 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="mt-1 text-xl font-semibold text-pine-deep">
              Add journey item
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Add a treatment, referral, follow-up, care task, or milestone to
              the patient&apos;s care journey.
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div>
            <label className="block text-sm font-semibold text-ink">
              Item type
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {journeyTypes.map((option) => {
                const selected = itemType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setItemType(option.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-pine bg-pine-tint"
                        : "border-border bg-white hover:border-pine/30"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        selected ? "text-pine-deep" : "text-ink"
                      }`}
                    >
                      {option.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <Field
              label="Title"
              required
              value={title}
              onChange={setTitle}
              placeholder={getTitlePlaceholder(itemType)}
            />
          </div>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-ink">
              Description
            </label>

            <textarea
              value={description}
              disabled={isSubmitting}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Add relevant care journey details..."
              className="mt-2 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-pine focus:ring-2 focus:ring-pine/10 disabled:opacity-60"
            />
          </div>

          <div className="mt-5">
            <Field
              label="Scheduled date and time"
              type="datetime-local"
              value={scheduledAt}
              onChange={setScheduledAt}
            />

            <p className="mt-2 text-xs leading-5 text-ink-soft">
              Optional. Leave blank when the item does not have a scheduled time
              yet.
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-pine-tint p-4">
            <input
              type="checkbox"
              checked={patientVisible}
              disabled={isSubmitting}
              onChange={(event) => setPatientVisible(event.target.checked)}
              className="mt-1"
            />

            <div>
              <p className="text-sm font-semibold text-pine-deep">
                Show this item to the patient
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-soft">
                The item will appear in the patient&apos;s care journey.
              </p>
            </div>
          </label>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-priority-high-tint p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-priority-high" />

              <p className="text-sm text-priority-high">{error}</p>
            </div>
          )}

          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}

              {isSubmitting ? "Adding..." : "Add journey item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;

  value: string;

  onChange: (value: string) => void;

  type?: string;

  placeholder?: string;

  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink">
        {label}

        {required && <span className="ml-1 text-priority-high">*</span>}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-pine focus:ring-2 focus:ring-pine/10"
      />
    </div>
  );
}

function getTitlePlaceholder(itemType: SupportedJourneyItemType) {
  switch (itemType) {
    case "treatment":
      return "Example: Chemotherapy session";

    case "referral":
      return "Example: Nutrition referral";

    case "follow_up":
      return "Example: Post-treatment follow-up";

    case "care_task":
      return "Example: Complete intake paperwork";

    case "milestone":
      return "Example: Treatment plan completed";
  }
}
