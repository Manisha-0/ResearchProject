"use client";

import { AlertCircle, LoaderCircle, UserPlus, X } from "lucide-react";
import { useState } from "react";

import { createPatient } from "@/lib/navigator-api";

import type { PatientCreateResponse } from "@/types/navigator";

type AddPatientDialogProps = {
  onClose: () => void;

  onCreated: (patient: PatientCreateResponse) => void;
};

export function AddPatientDialog({
  onClose,
  onCreated,
}: AddPatientDialogProps) {
  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [phone, setPhone] = useState("");

  const [careProgram, setCareProgram] = useState("Cancer Navigation");

  const [externalReference, setExternalReference] = useState("");

  const [preferredLanguage, setPreferredLanguage] = useState("English");

  const [preferredContactMethod, setPreferredContactMethod] = useState("phone");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !dateOfBirth
    ) {
      setError("First name, last name, email, and date of birth are required.");

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const patient = await createPatient({
        first_name: firstName.trim(),

        last_name: lastName.trim(),

        email: email.trim(),

        date_of_birth: dateOfBirth,

        phone: phone.trim() ? phone.trim() : null,

        preferred_language: preferredLanguage.trim() || "English",

        preferred_contact_method: preferredContactMethod || null,

        care_program: careProgram.trim() ? careProgram.trim() : null,

        external_patient_reference: externalReference.trim()
          ? externalReference.trim()
          : null,
      });

      onCreated(patient);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the patient invitation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Navigator action
            </p>

            <h2 className="mt-1 text-xl font-semibold text-navy-deep">
              Add patient
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Create the patient record and send an activation invitation.
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              required
              value={firstName}
              onChange={setFirstName}
            />

            <Field
              label="Last name"
              required
              value={lastName}
              onChange={setLastName}
            />

            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={setEmail}
            />

            <Field
              label="Date of birth"
              type="date"
              required
              value={dateOfBirth}
              onChange={setDateOfBirth}
            />

            <Field label="Phone" type="tel" value={phone} onChange={setPhone} />

            <Field
              label="Patient reference"
              value={externalReference}
              onChange={setExternalReference}
              placeholder="Optional internal reference"
            />

            <Field
              label="Care program"
              value={careProgram}
              onChange={setCareProgram}
            />

            <Field
              label="Preferred language"
              value={preferredLanguage}
              onChange={setPreferredLanguage}
            />

            <div>
              <label className="block text-sm font-semibold text-ink">
                Preferred contact
              </label>

              <select
                value={preferredContactMethod}
                onChange={(event) =>
                  setPreferredContactMethod(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
              >
                <option value="phone">Phone</option>

                <option value="email">Email</option>

                <option value="text">Text</option>
              </select>
            </div>
          </div>

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
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}

              {isSubmitting ? "Creating..." : "Create & invite"}
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
        className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-navy focus:ring-2 focus:ring-navy/10"
      />
    </div>
  );
}
