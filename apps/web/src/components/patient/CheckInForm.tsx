"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import type {
  MedicationStatus,
  SymptomSeverity,
  TransportStatus,
} from "@/lib/types";

import { useCompassStore } from "@/store/compass-store";

type CheckInFormProps = {
  patientId: string;
};

export function CheckInForm({ patientId }: CheckInFormProps) {
  const submitCheckIn = useCompassStore((state) => state.submitCheckIn);

  const [nausea, setNausea] = useState<SymptomSeverity>("none");

  const [transportStatus, setTransportStatus] =
    useState<TransportStatus>("confirmed");

  const [medicationStatus, setMedicationStatus] =
    useState<MedicationStatus>("on_track");

  const [note, setNote] = useState("");

  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    submitCheckIn(patientId, {
      nausea,
      transportStatus,
      medicationStatus,
      note,
    });

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-priority-low/20 bg-priority-low-tint p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-priority-low" />

          <div>
            <h2 className="font-semibold text-ink">Thank you, Manisha.</h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Your care navigation team can now see your update.
            </p>

            {transportStatus !== "confirmed" && (
              <p className="mt-3 text-sm font-medium text-navy">
                We noticed you may need help getting to tomorrow&apos;s
                appointment.
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
          This takes about a minute and helps your care navigation team
          understand where you may need support.
        </p>
      </div>

      <div className="mt-7 space-y-8">
        <Question
          title="How is your nausea?"
          options={[
            {
              label: "None",
              active: nausea === "none",
              onClick: () => setNausea("none"),
            },
            {
              label: "Mild",
              active: nausea === "mild",
              onClick: () => setNausea("mild"),
            },
            {
              label: "Moderate",
              active: nausea === "moderate",
              onClick: () => setNausea("moderate"),
            },
            {
              label: "Severe",
              active: nausea === "severe",
              onClick: () => setNausea("severe"),
            },
          ]}
        />

        <Question
          title="Do you have transportation for tomorrow?"
          options={[
            {
              label: "Yes",
              active: transportStatus === "confirmed",
              onClick: () => setTransportStatus("confirmed"),
            },
            {
              label: "Not sure",
              active: transportStatus === "not_sure",
              onClick: () => setTransportStatus("not_sure"),
            },
            {
              label: "No",
              active: transportStatus === "unavailable",
              onClick: () => setTransportStatus("unavailable"),
            },
          ]}
        />

        <Question
          title="Are you able to take your medications as planned?"
          options={[
            {
              label: "Yes",
              active: medicationStatus === "on_track",
              onClick: () => setMedicationStatus("on_track"),
            },
            {
              label: "I'm having trouble",
              active: medicationStatus === "having_trouble",
              onClick: () => setMedicationStatus("having_trouble"),
            },
          ]}
        />

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-semibold text-ink"
          >
            Anything else you&apos;d like your navigator to know?
          </label>

          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="For example: I'm worried I won't have a ride tomorrow."
            rows={4}
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
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="
          mt-8
          w-full
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
        "
      >
        Submit check-in
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
