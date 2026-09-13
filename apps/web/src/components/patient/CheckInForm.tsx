"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import { submitMyCheckIn } from "@/lib/patient-api";

import type {
  CheckInResponse,
} from "@/types/patient";

type SymptomLevel =
  | "none"
  | "mild"
  | "moderate"
  | "severe";

type TransportStatus =
  | "confirmed"
  | "not_sure"
  | "unavailable";

type MedicationStatus =
  | "on_track"
  | "having_trouble";

type CheckInFormProps = {
  onSubmitted?: (
    checkIn: CheckInResponse,
  ) => void;
};

export function CheckInForm({
  onSubmitted,
}: CheckInFormProps) {
  const [symptomLevel, setSymptomLevel] =
    useState<SymptomLevel>("none");

  const [
    transportStatus,
    setTransportStatus,
  ] =
    useState<TransportStatus>(
      "confirmed",
    );

  const [
    medicationStatus,
    setMedicationStatus,
  ] =
    useState<MedicationStatus>(
      "on_track",
    );

  const [
    financialConcern,
    setFinancialConcern,
  ] = useState(false);

  const [
    requestedHelp,
    setRequestedHelp,
  ] = useState(false);

  const [note, setNote] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const checkIn =
        await submitMyCheckIn({
          symptom_severity:
            getSymptomSeverity(
              symptomLevel,
            ),

          transportation_confirmed:
            getTransportationValue(
              transportStatus,
            ),

          medication_access_issue:
            medicationStatus ===
            "having_trouble",

          financial_concern:
            financialConcern,

          requested_help:
            requestedHelp,

          free_text:
            note.trim().length > 0
              ? note.trim()
              : null,
        });

      setSubmitted(true);

      onSubmitted?.(checkIn);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit your check-in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-priority-low/20 bg-priority-low-tint p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-priority-low" />

          <div>
            <h2 className="font-semibold text-ink">
              Thank you.
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Your care navigation team can now
              see your update.
            </p>

            {transportStatus !==
              "confirmed" && (
              <p className="mt-3 text-sm font-medium text-navy">
                We noticed you may need help
                with transportation.
              </p>
            )}

            {requestedHelp && (
              <p className="mt-2 text-sm font-medium text-navy">
                Your request for navigator
                support was included.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          Today&apos;s check-in
        </p>

        <h2 className="mt-2 text-xl font-semibold text-navy-deep">
          How are you feeling today?
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-soft">
          This takes about a minute and
          helps your care navigation team
          understand where you may need
          support.
        </p>
      </div>

      <div className="mt-7 space-y-8">
        <Question
          title="How severe are your symptoms today?"
          options={[
            {
              label: "None",
              active:
                symptomLevel ===
                "none",
              onClick: () =>
                setSymptomLevel(
                  "none",
                ),
            },
            {
              label: "Mild",
              active:
                symptomLevel ===
                "mild",
              onClick: () =>
                setSymptomLevel(
                  "mild",
                ),
            },
            {
              label: "Moderate",
              active:
                symptomLevel ===
                "moderate",
              onClick: () =>
                setSymptomLevel(
                  "moderate",
                ),
            },
            {
              label: "Severe",
              active:
                symptomLevel ===
                "severe",
              onClick: () =>
                setSymptomLevel(
                  "severe",
                ),
            },
          ]}
        />

        <Question
          title="Do you have transportation for your next appointment?"
          options={[
            {
              label: "Yes",
              active:
                transportStatus ===
                "confirmed",
              onClick: () =>
                setTransportStatus(
                  "confirmed",
                ),
            },
            {
              label: "Not sure",
              active:
                transportStatus ===
                "not_sure",
              onClick: () =>
                setTransportStatus(
                  "not_sure",
                ),
            },
            {
              label: "No",
              active:
                transportStatus ===
                "unavailable",
              onClick: () =>
                setTransportStatus(
                  "unavailable",
                ),
            },
          ]}
        />

        <Question
          title="Are you able to take your medications as planned?"
          options={[
            {
              label: "Yes",
              active:
                medicationStatus ===
                "on_track",
              onClick: () =>
                setMedicationStatus(
                  "on_track",
                ),
            },
            {
              label:
                "I'm having trouble",
              active:
                medicationStatus ===
                "having_trouble",
              onClick: () =>
                setMedicationStatus(
                  "having_trouble",
                ),
            },
          ]}
        />

        <YesNoQuestion
          title="Are costs or financial concerns making care harder right now?"
          value={financialConcern}
          onChange={
            setFinancialConcern
          }
        />

        <YesNoQuestion
          title="Would you like your navigator to contact you for help?"
          value={requestedHelp}
          onChange={
            setRequestedHelp
          }
        />

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-semibold text-ink"
          >
            Anything else you&apos;d like
            your navigator to know?
          </label>

          <textarea
            id="note"
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            placeholder="For example: I'm worried I won't have a ride to my appointment."
            rows={4}
            maxLength={3000}
            className="
              mt-3
              w-full
              resize-none
              rounded-xl
              border
              border-border
              bg-white
              px-4
              py-3
              text-sm
              text-ink
              outline-none
              transition
              placeholder:text-ink-soft/50
              focus:border-navy
              focus:ring-2
              focus:ring-navy/10
            "
          />

          <p className="mt-2 text-right text-xs text-ink-soft">
            {note.length} / 3000
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-priority-high-tint p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-priority-high" />

          <p className="text-sm text-priority-high">
            {error}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() =>
          void handleSubmit()
        }
        className="
          mt-8
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-navy
          px-5
          py-3.5
          text-sm
          font-semibold
          text-white
          transition
          hover:bg-navy-deep
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-gold
          focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {isSubmitting && (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        )}

        {isSubmitting
          ? "Submitting..."
          : "Submit check-in"}
      </button>
    </section>
  );
}

type QuestionOption = {
  label: string;
  active: boolean;
  onClick: () => void;
};

type QuestionProps = {
  title: string;
  options: QuestionOption[];
};

function Question({
  title,
  options,
}: QuestionProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">
        {title}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={
              option.onClick
            }
            className={[
              "rounded-full border px-4 py-2.5 text-sm font-medium transition",
              option.active
                ? "border-navy bg-navy text-white"
                : "border-border bg-surface-soft text-ink-soft hover:border-navy/30 hover:text-navy",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoQuestion({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <Question
      title={title}
      options={[
        {
          label: "No",
          active: !value,
          onClick: () =>
            onChange(false),
        },
        {
          label: "Yes",
          active: value,
          onClick: () =>
            onChange(true),
        },
      ]}
    />
  );
}

function getSymptomSeverity(
  level: SymptomLevel,
) {
  switch (level) {
    case "none":
      return 0;

    case "mild":
      return 3;

    case "moderate":
      return 6;

    case "severe":
      return 8;
  }
}

function getTransportationValue(
  status: TransportStatus,
): boolean | null {
  switch (status) {
    case "confirmed":
      return true;

    case "not_sure":
      return null;

    case "unavailable":
      return false;
  }
}