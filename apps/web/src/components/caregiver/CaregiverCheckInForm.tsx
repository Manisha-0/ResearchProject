"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { useState } from "react";

import { submitCaregiverCheckIn } from "@/lib/caregiver-api";

import type { CaregiverCheckInResponse } from "@/types/caregiver";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

type MedicationStatus = "on_track" | "having_trouble";

type CaregiverCheckInFormProps = {
  patientId: string;

  patientFirstName: string;

  relationship: string;

  onSubmitted?: (checkIn: CaregiverCheckInResponse) => void;
};

export function CaregiverCheckInForm({
  patientId,
  patientFirstName,
  relationship,
  onSubmitted,
}: CaregiverCheckInFormProps) {
  const [symptomLevel, setSymptomLevel] = useState<SymptomLevel>("none");

  const [medicationStatus, setMedicationStatus] =
    useState<MedicationStatus>("on_track");

  const [financialConcern, setFinancialConcern] = useState(false);

  const [requestedHelp, setRequestedHelp] = useState(false);

  const [note, setNote] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSymptomLevel("none");

    setMedicationStatus("on_track");

    setFinancialConcern(false);

    setRequestedHelp(false);

    setNote("");

    setError(null);

    setSubmitted(false);
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    setError(null);

    try {
      const checkIn = await submitCaregiverCheckIn(patientId, {
        symptom_severity: getSymptomSeverity(symptomLevel),

        // Transportation is intentionally
        // excluded from proxy check-ins.
        //
        // Caregivers use the dedicated
        // transportation workflow when they
        // have TRANSPORTATION permission.
        transportation_confirmed: null,

        medication_access_issue: medicationStatus === "having_trouble",

        financial_concern: financialConcern,

        requested_help: requestedHelp,

        free_text: note.trim().length > 0 ? note.trim() : null,
      });

      setSubmitted(true);

      onSubmitted?.(checkIn);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit " + "the caregiver " + "check-in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mt-6 rounded-2xl border border-priority-low/20 bg-priority-low-tint p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-priority-low" />

          <div className="flex-1">
            <h2 className="font-semibold text-ink">Check-in submitted</h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Your update for {patientFirstName} has been shared with the
              navigation team.
            </p>

            {requestedHelp && (
              <p className="mt-3 text-sm font-medium text-navy">
                The request for navigator support was included.
              </p>
            )}

            <p className="mt-3 text-xs leading-5 text-ink-soft">
              This check-in is recorded as a caregiver update submitted on{" "}
              {patientFirstName}
              &apos;s behalf.
            </p>

            <button
              type="button"
              onClick={resetForm}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-priority-low/25 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition hover:border-navy/30"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Submit another update
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          Check in for {patientFirstName}
        </p>

        <h2 className="mt-2 text-xl font-semibold text-navy-deep">
          Share an update on {patientFirstName}
          &apos;s behalf
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-soft">
          As {relationship}, you can share information with the care navigation
          team when {patientFirstName} has given you proxy check-in access.
        </p>

        <div className="mt-4 rounded-xl bg-navy-tint p-4">
          <p className="text-xs leading-5 text-ink-soft">
            Report what you know about {patientFirstName}
            &apos;s current situation. This does not give you access to{" "}
            {patientFirstName}
            &apos;s private check-in history or navigator notes.
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-8">
        <Question
          title={`How severe are ${patientFirstName}'s symptoms today?`}
          options={[
            {
              label: "None",

              active: symptomLevel === "none",

              onClick: () => setSymptomLevel("none"),
            },
            {
              label: "Mild",

              active: symptomLevel === "mild",

              onClick: () => setSymptomLevel("mild"),
            },
            {
              label: "Moderate",

              active: symptomLevel === "moderate",

              onClick: () => setSymptomLevel("moderate"),
            },
            {
              label: "Severe",

              active: symptomLevel === "severe",

              onClick: () => setSymptomLevel("severe"),
            },
          ]}
        />

        <Question
          title={`Is ${patientFirstName} able to take medications as planned?`}
          options={[
            {
              label: "Yes",

              active: medicationStatus === "on_track",

              onClick: () => setMedicationStatus("on_track"),
            },
            {
              label: "Having trouble",

              active: medicationStatus === "having_trouble",

              onClick: () => setMedicationStatus("having_trouble"),
            },
          ]}
        />

        <YesNoQuestion
          title={`Are costs or financial concerns making care harder for ${patientFirstName} right now?`}
          value={financialConcern}
          onChange={setFinancialConcern}
        />

        <YesNoQuestion
          title={`Would ${patientFirstName} like help from the navigation team?`}
          value={requestedHelp}
          onChange={setRequestedHelp}
        />

        <div>
          <label
            htmlFor={`caregiver-note-${patientId}`}
            className="block text-sm font-semibold text-ink"
          >
            Anything else the navigation team should know?
          </label>

          <textarea
            id={`caregiver-note-${patientId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={`For example: ${patientFirstName} has been more tired today and asked me to contact the navigation team.`}
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

          <p className="text-sm text-priority-high">{error}</p>
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleSubmit()}
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
        {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}

        {isSubmitting
          ? "Submitting..."
          : `Submit check-in for ${patientFirstName}`}
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

function Question({ title, options }: QuestionProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={option.onClick}
            className={[
              "rounded-full border " +
                "px-4 py-2.5 " +
                "text-sm font-medium " +
                "transition",
              option.active
                ? "border-navy " + "bg-navy " + "text-white"
                : "border-border " +
                  "bg-surface-soft " +
                  "text-ink-soft " +
                  "hover:border-navy/30 " +
                  "hover:text-navy",
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

  onChange: (value: boolean) => void;
}) {
  return (
    <Question
      title={title}
      options={[
        {
          label: "No",

          active: !value,

          onClick: () => onChange(false),
        },
        {
          label: "Yes",

          active: value,

          onClick: () => onChange(true),
        },
      ]}
    />
  );
}

function getSymptomSeverity(level: SymptomLevel) {
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
