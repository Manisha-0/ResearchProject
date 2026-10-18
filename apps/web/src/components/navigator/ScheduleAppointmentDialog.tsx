"use client";

import { AlertCircle, CalendarPlus, LoaderCircle, X } from "lucide-react";

import { useState } from "react";

import { createPatientAppointment } from "@/lib/navigator-api";

type ScheduleAppointmentDialogProps = {
  patientId: string;

  onClose: () => void;

  onCreated: () => void;
};

export function ScheduleAppointmentDialog({
  patientId,
  onClose,
  onCreated,
}: ScheduleAppointmentDialogProps) {
  const [title, setTitle] = useState("");

  const [scheduledStart, setScheduledStart] = useState("");

  const [scheduledEnd, setScheduledEnd] = useState("");

  const [appointmentType, setAppointmentType] = useState("");

  const [providerName, setProviderName] = useState("");

  const [department, setDepartment] = useState("");

  const [locationName, setLocationName] = useState("");

  const [addressText, setAddressText] = useState("");

  const [notes, setNotes] = useState("");

  const [patientVisible, setPatientVisible] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!title.trim() || !scheduledStart) {
      setError("Appointment title and start time are required.");

      return;
    }

    if (
      scheduledEnd &&
      new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()
    ) {
      setError("End time must be after the start time.");

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPatientAppointment(patientId, {
        title: title.trim(),

        scheduled_start: new Date(scheduledStart).toISOString(),

        scheduled_end: scheduledEnd
          ? new Date(scheduledEnd).toISOString()
          : null,

        appointment_type: appointmentType.trim() || null,

        provider_name: providerName.trim() || null,

        department: department.trim() || null,

        location_name: locationName.trim() || null,

        address_text: addressText.trim() || null,

        notes: notes.trim() || null,

        patient_visible: patientVisible,
      });

      onCreated();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to schedule the appointment.",
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
              Schedule appointment
            </h2>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Appointment title"
                required
                value={title}
                onChange={setTitle}
                placeholder="Example: Oncology follow-up"
              />
            </div>

            <Field
              label="Start"
              required
              type="datetime-local"
              value={scheduledStart}
              onChange={setScheduledStart}
            />

            <Field
              label="End"
              type="datetime-local"
              value={scheduledEnd}
              onChange={setScheduledEnd}
            />

            <Field
              label="Appointment type"
              value={appointmentType}
              onChange={setAppointmentType}
              placeholder="Follow-up"
            />

            <Field
              label="Provider"
              value={providerName}
              onChange={setProviderName}
            />

            <Field
              label="Department"
              value={department}
              onChange={setDepartment}
            />

            <Field
              label="Location"
              value={locationName}
              onChange={setLocationName}
            />

            <div className="sm:col-span-2">
              <Field
                label="Address"
                value={addressText}
                onChange={setAddressText}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-ink">
                Notes
              </label>

              <textarea
                rows={4}
                maxLength={3000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-pine-tint p-4">
            <input
              type="checkbox"
              checked={patientVisible}
              onChange={(event) => setPatientVisible(event.target.checked)}
              className="mt-1"
            />

            <div>
              <p className="text-sm font-semibold text-pine-deep">
                Show this appointment to the patient
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-soft">
                The appointment will appear in the patient&apos;s Compass care
                journey.
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
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
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

              {isSubmitting ? "Scheduling..." : "Schedule appointment"}
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
        className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
      />
    </div>
  );
}
