"use client";

import { AlertCircle, LoaderCircle, UserPlus, X } from "lucide-react";

import { useState } from "react";

import { inviteCaregiver, recordCaregiverConsent } from "@/lib/navigator-api";

import type {
  CaregiverConsentMethod,
  CaregiverPermissionType,
} from "@/types/navigator";

const PERMISSIONS: {
  value: CaregiverPermissionType;
  label: string;
  description: string;
}[] = [
  {
    value: "appointments",
    label: "Appointments",
    description: "See upcoming appointments.",
  },
  {
    value: "transportation",
    label: "Transportation",
    description: "Help arrange rides.",
  },
  {
    value: "proxy_check_in",
    label: "Check in for the patient",
    description: "Answer check-ins on the patient's behalf.",
  },
  {
    value: "care_tasks",
    label: "Care tasks",
    description: "See shared care coordination tasks.",
  },
  {
    value: "documents",
    label: "Documents",
    description: "See documents shared with the patient.",
  },
];

const METHODS: { value: CaregiverConsentMethod; label: string }[] = [
  { value: "phone", label: "By phone" },
  { value: "in_person", label: "In person" },
  { value: "paper_form", label: "Paper form" },
];

/* A request already waiting for the patient's approval. */
type WaitingRequest = {
  caregiver_access_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
};

type InviteCaregiverDialogProps = {
  patientId: string;

  patientName: string;

  /* Given: only record consent for this waiting request. */
  waiting?: WaitingRequest;

  onClose: () => void;

  onDone: (message: string) => void;
};

export function InviteCaregiverDialog({
  patientId,
  patientName,
  waiting,
  onClose,
  onDone,
}: InviteCaregiverDialogProps) {
  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [relationship, setRelationship] = useState("");

  // "recorded": the patient already agreed; "in_app": ask them
  // to approve in the app.
  const [approval, setApproval] = useState<"recorded" | "in_app">("recorded");

  const [method, setMethod] = useState<CaregiverConsentMethod>("phone");

  const [givenBy, setGivenBy] = useState(`${patientName} (patient)`);

  const [note, setNote] = useState("");

  const [permissions, setPermissions] = useState<CaregiverPermissionType[]>([
    "appointments",
    "transportation",
    "proxy_check_in",
  ]);

  const [confirmed, setConfirmed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const recording = waiting !== undefined || approval === "recorded";

  function togglePermission(value: CaregiverPermissionType) {
    setPermissions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (
      !waiting &&
      (!firstName.trim() ||
        !lastName.trim() ||
        !email.trim() ||
        !relationship.trim())
    ) {
      setError("Name, email and relationship are required.");
      return;
    }

    if (recording) {
      if (permissions.length === 0) {
        setError("Choose at least one thing the caregiver can do.");
        return;
      }

      if (!givenBy.trim()) {
        setError("Say who gave consent.");
        return;
      }

      if (!confirmed) {
        setError("Confirm that the patient agreed before saving.");
        return;
      }
    }

    const consent = recording
      ? {
          method,
          given_by: givenBy.trim(),
          note: note.trim() || undefined,
          permissions,
        }
      : undefined;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = waiting
        ? await recordCaregiverConsent(
            patientId,
            waiting.caregiver_access_id,
            consent!,
          )
        : await inviteCaregiver(patientId, {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            relationship: relationship.trim(),
            phone: phone.trim() || undefined,
            consent,
          });

      onDone(response.message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the caregiver.",
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
              {waiting
                ? `Record ${patientName}'s consent`
                : "Invite a caregiver"}
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              {waiting
                ? `${waiting.first_name} ${waiting.last_name} (${waiting.relationship}) is waiting for ${patientName}'s approval.`
                : `A caregiver can only see what ${patientName} agrees to.`}
            </p>
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
          {!waiting && (
            <>
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
                  required
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="The activation link is sent here"
                />

                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+19855550123"
                />

                <div className="sm:col-span-2">
                  <Field
                    label="Relationship to the patient"
                    required
                    value={relationship}
                    onChange={setRelationship}
                    placeholder="Daughter, husband, friend…"
                  />
                </div>
              </div>

              <fieldset className="mt-7">
                <legend className="text-sm font-semibold text-ink">
                  Patient&apos;s consent
                </legend>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    selected={approval === "recorded"}
                    onSelect={() => setApproval("recorded")}
                    title={`${patientName} has agreed`}
                    text="Record the consent now. The caregiver gets access straight away."
                  />

                  <ChoiceCard
                    selected={approval === "in_app"}
                    onSelect={() => setApproval("in_app")}
                    title="Ask in the app"
                    text={`${patientName} approves the request in Compass and chooses permissions.`}
                  />
                </div>
              </fieldset>
            </>
          )}

          {recording && (
            <div
              className={`${waiting ? "" : "mt-6 "}rounded-xl border border-border bg-surface-soft p-4 sm:p-5`}
            >
              <p className="text-sm font-semibold text-ink">
                How did the patient agree?
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {METHODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={method === option.value}
                    onClick={() => setMethod(option.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      method === option.value
                        ? "border-pine bg-pine text-white"
                        : "border-border bg-white text-ink hover:bg-pine-tint"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <Field
                  label="Who gave consent"
                  required
                  value={givenBy}
                  onChange={setGivenBy}
                />
              </div>

              <p className="mt-5 text-sm font-semibold text-ink">
                What the patient allowed
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(permission.value)}
                      onChange={() => togglePermission(permission.value)}
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {permission.label}
                      </span>

                      <span className="block text-xs text-ink-soft">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-5 block text-sm font-semibold text-ink">
                Note
              </label>

              <textarea
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Example: Patient agreed during follow-up call on Oct 19."
                className="mt-2 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
              />

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-pine-tint p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />

                <span className="text-sm leading-6 text-pine-deep">
                  I confirm {patientName} (or their legal representative)
                  agreed to this access. My name and the time are saved with
                  this record.
                </span>
              </label>
            </div>
          )}

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
                <UserPlus className="h-4 w-4" />
              )}

              {isSubmitting
                ? "Saving..."
                : waiting
                  ? "Save consent"
                  : recording
                    ? "Invite with consent"
                    : "Send request to patient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  text,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-xl border-2 p-4 text-left transition ${
        selected
          ? "border-pine bg-pine-tint"
          : "border-border bg-white hover:border-pine/40"
      }`}
    >
      <span className="block text-sm font-semibold text-ink">{title}</span>

      <span className="mt-1 block text-xs leading-5 text-ink-soft">
        {text}
      </span>
    </button>
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
