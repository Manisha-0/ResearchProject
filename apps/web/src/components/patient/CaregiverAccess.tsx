"use client";

import {
  AlertCircle,
  Check,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";

import {
  addMyCaregiver,
  approveMyCaregiver,
  declineMyCaregiver,
  getMyCaregivers,
  revokeMyCaregiver,
  updateMyCaregiverPermissions,
} from "@/lib/patient-caregiver-api";

import { useAuthStore } from "@/store/auth-store";

import type {
  AddPatientCaregiverRequest,
  CaregiverPermission,
  PatientCaregiver,
} from "@/types/patient-caregiver";

const PERMISSIONS: {
  value: CaregiverPermission;
  label: string;
  description: string;
}[] = [
  {
    value: "appointments",
    label: "Appointments",
    description: "View upcoming appointment information.",
  },
  {
    value: "transportation",
    label: "Transportation",
    description: "Help coordinate transportation.",
  },
  {
    value: "care_tasks",
    label: "Care tasks",
    description: "View shared care coordination tasks.",
  },
  {
    value: "proxy_check_in",
    label: "Proxy check-ins",
    description: "Submit navigation check-ins on your behalf.",
  },
  {
    value: "documents",
    label: "Documents",
    description: "View documents shared with you.",
  },
];

export function CaregiverAccess() {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [caregivers, setCaregivers] = useState<PatientCaregiver[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);

  const [managing, setManaging] = useState<PatientCaregiver | null>(null);

  const handleError = useCallback(
    (caughtError: unknown) => {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to manage caregiver access.",
      );
    },
    [logout, router],
  );

  const refresh = useCallback(async () => {
    try {
      const data = await getMyCaregivers();

      setCaregivers(data);
      setError(null);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }, [handleError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCaregivers() {
      try {
        const data = await getMyCaregivers();

        if (!cancelled) {
          setCaregivers(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          handleError(caughtError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchCaregivers();

    return () => {
      cancelled = true;
    };
  }, [handleError]);

  const activeCaregivers = caregivers.filter(
    (caregiver) =>
      caregiver.status !== "pending_patient_approval" &&
      caregiver.status !== "revoked",
  );

  const pendingRequests = caregivers.filter(
    (caregiver) => caregiver.status === "pending_patient_approval",
  );

  return (
    <>
      <section className="border-t border-border pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.5rem] font-bold leading-tight text-pine-deep">
              People helping with my care
            </h2>

            <p className="mt-2 text-base leading-6 text-ink-soft">
              Choose who can help coordinate your care and exactly what they are
              allowed to see or do.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-pine px-3.5 py-2.5 text-base font-semibold text-white transition hover:bg-pine-deep"
          >
            <Plus className="h-4 w-4" />
            Add caregiver
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-priority-high-tint p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-priority-high" />

            <p className="text-base text-priority-high">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-surface-soft p-4 text-base text-ink-soft">
            <LoaderCircle className="h-4 w-4 animate-spin text-pine" />
            Loading caregiver access...
          </div>
        )}

        {!isLoading && pendingRequests.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-ink-soft">
              Requests awaiting your approval
            </p>

            <div className="mt-3 space-y-3">
              {pendingRequests.map((caregiver) => (
                <PendingCaregiver
                  key={caregiver.caregiver_access_id}
                  caregiver={caregiver}
                  onChanged={refresh}
                  onError={handleError}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading &&
          activeCaregivers.length === 0 &&
          pendingRequests.length === 0 && (
            <div className="mt-5 rounded-xl bg-surface-soft p-5">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-pine" />

                <div>
                  <p className="text-base font-semibold text-ink">
                    No caregivers added yet
                  </p>

                  <p className="mt-1 text-base leading-6 text-ink-soft">
                    Add a trusted caregiver if you want someone to help
                    coordinate appointments, transportation, check-ins, or
                    shared documents.
                  </p>
                </div>
              </div>
            </div>
          )}

        {!isLoading && activeCaregivers.length > 0 && (
          <div className="mt-6 space-y-3">
            {activeCaregivers.map((caregiver) => (
              <CaregiverCard
                key={caregiver.caregiver_access_id}
                caregiver={caregiver}
                onManage={() => setManaging(caregiver)}
              />
            ))}
          </div>
        )}
      </section>

      {showAdd && (
        <AddCaregiverDialog
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            setShowAdd(false);
            await refresh();
          }}
          onError={handleError}
        />
      )}

      {managing && (
        <ManageCaregiverDialog
          caregiver={managing}
          onClose={() => setManaging(null)}
          onChanged={async () => {
            setManaging(null);
            await refresh();
          }}
          onError={handleError}
        />
      )}
    </>
  );
}

function CaregiverCard({
  caregiver,
  onManage,
}: {
  caregiver: PatientCaregiver;
  onManage: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink">
              {caregiver.caregiver_name}
            </h3>

            <StatusBadge status={caregiver.status} />
          </div>

          <p className="mt-1 text-base text-ink-soft">
            {caregiver.relationship}
            {" · "}
            {caregiver.email}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {caregiver.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full bg-white px-2.5 py-1 text-sm font-medium text-pine"
              >
                {permissionLabel(permission)}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onManage}
          className="rounded-lg border border-border bg-white px-3.5 py-2 text-base font-semibold text-pine transition hover:bg-pine-tint"
        >
          Manage access
        </button>
      </div>
    </div>
  );
}

function PendingCaregiver({
  caregiver,
  onChanged,
  onError,
}: {
  caregiver: PatientCaregiver;
  onChanged: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [permissions, setPermissions] = useState<CaregiverPermission[]>([
    "appointments",
    "transportation",
  ]);

  const [isSaving, setIsSaving] = useState(false);

  async function approve() {
    if (permissions.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      await approveMyCaregiver(caregiver.caregiver_access_id, {
        permissions,
      });

      await onChanged();
    } catch (caughtError) {
      onError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  async function decline() {
    setIsSaving(true);

    try {
      await declineMyCaregiver(caregiver.caregiver_access_id);

      await onChanged();
    } catch (caughtError) {
      onError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-sun/30 bg-sun/5 p-4">
      <p className="font-semibold text-ink">{caregiver.caregiver_name}</p>

      <p className="mt-1 text-base text-ink-soft">
        {caregiver.relationship}
        {" · "}
        {caregiver.email}
      </p>

      <p className="mt-4 text-base font-semibold text-ink">
        Choose what they can access
      </p>

      <PermissionSelector value={permissions} onChange={setPermissions} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving || permissions.length === 0}
          onClick={() => void approve()}
          className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Approve
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void decline()}
          className="rounded-lg border border-border bg-white px-4 py-2 text-base font-semibold text-ink"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function AddCaregiverDialog({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [form, setForm] = useState<AddPatientCaregiverRequest>({
    first_name: "",
    last_name: "",
    email: "",
    relationship: "",
    phone: null,
    permissions: ["appointments", "transportation"],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.email.trim() ||
      !form.relationship.trim() ||
      form.permissions.length === 0
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addMyCaregiver({
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        relationship: form.relationship.trim(),
        phone: form.phone?.trim() || null,
      });

      await onCreated();
    } catch (caughtError) {
      onError(caughtError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogShell
      title="Add caregiver"
      description="Invite someone you trust and choose exactly what they can access."
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          value={form.first_name}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              first_name: value,
            }))
          }
        />

        <Field
          label="Last name"
          value={form.last_name}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              last_name: value,
            }))
          }
        />
      </div>

      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={(value) =>
          setForm((current) => ({
            ...current,
            email: value,
          }))
        }
      />

      <Field
        label="Relationship"
        placeholder="For example: Daughter, Sister, Spouse"
        value={form.relationship}
        onChange={(value) =>
          setForm((current) => ({
            ...current,
            relationship: value,
          }))
        }
      />

      <Field
        label="Phone (optional)"
        value={form.phone ?? ""}
        onChange={(value) =>
          setForm((current) => ({
            ...current,
            phone: value,
          }))
        }
      />

      <div>
        <p className="text-base font-semibold text-ink">Permissions</p>

        <p className="mt-1 text-sm leading-5 text-ink-soft">
          You can change these later.
        </p>

        <PermissionSelector
          value={form.permissions}
          onChange={(permissions) =>
            setForm((current) => ({
              ...current,
              permissions,
            }))
          }
        />
      </div>

      <button
        type="button"
        disabled={isSubmitting || form.permissions.length === 0}
        onClick={() => void submit()}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pine px-4 py-3 text-base font-semibold text-white transition hover:bg-pine-deep disabled:opacity-50"
      >
        {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        Send caregiver invitation
      </button>
    </DialogShell>
  );
}

function ManageCaregiverDialog({
  caregiver,
  onClose,
  onChanged,
  onError,
}: {
  caregiver: PatientCaregiver;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [permissions, setPermissions] = useState<CaregiverPermission[]>(
    caregiver.permissions,
  );

  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (permissions.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      await updateMyCaregiverPermissions(caregiver.caregiver_access_id, {
        permissions,
      });

      await onChanged();
    } catch (caughtError) {
      onError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  async function revoke() {
    setIsSaving(true);

    try {
      await revokeMyCaregiver(caregiver.caregiver_access_id);

      await onChanged();
    } catch (caughtError) {
      onError(caughtError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DialogShell
      title={`Manage ${caregiver.caregiver_name}`}
      description={`${caregiver.relationship} · ${caregiver.email}`}
      onClose={onClose}
    >
      <PermissionSelector value={permissions} onChange={setPermissions} />

      <button
        type="button"
        disabled={isSaving || permissions.length === 0}
        onClick={() => void save()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pine px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        Save permissions
      </button>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => {
          if (
            window.confirm(
              `Revoke ${caregiver.caregiver_name}'s caregiver access?`,
            )
          ) {
            void revoke();
          }
        }}
        className="w-full rounded-lg border border-priority-high/30 bg-priority-high-tint px-4 py-3 text-base font-semibold text-priority-high"
      >
        Revoke caregiver access
      </button>
    </DialogShell>
  );
}

function PermissionSelector({
  value,
  onChange,
}: {
  value: CaregiverPermission[];
  onChange: (value: CaregiverPermission[]) => void;
}) {
  function toggle(permission: CaregiverPermission) {
    if (value.includes(permission)) {
      onChange(value.filter((item) => item !== permission));
    } else {
      onChange([...value, permission]);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {PERMISSIONS.map((permission) => {
        const selected = value.includes(permission.value);

        return (
          <button
            key={permission.value}
            type="button"
            onClick={() => toggle(permission.value)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
              selected
                ? "border-pine bg-pine-tint"
                : "border-border bg-white hover:bg-surface-soft"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                selected
                  ? "bg-pine text-white"
                  : "border border-border bg-white"
              }`}
            >
              {selected && <Check className="h-3.5 w-3.5" />}
            </div>

            <div>
              <p className="text-base font-semibold text-ink">
                {permission.label}
              </p>

              <p className="mt-0.5 text-sm leading-5 text-ink-soft">
                {permission.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-deep/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-xl font-semibold text-pine-deep">{title}</h2>

            <p className="mt-1 text-base leading-6 text-ink-soft">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-base font-semibold text-ink">{label}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-pine"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: PatientCaregiver["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-priority-low-tint px-2.5 py-1 text-sm font-semibold text-priority-low">
        <ShieldCheck className="h-3 w-3" />
        Active
      </span>
    );
  }

  if (status === "invited") {
    return (
      <span className="rounded-full bg-pine-tint px-2.5 py-1 text-sm font-semibold text-pine">
        Invitation sent
      </span>
    );
  }

  return null;
}

function permissionLabel(permission: CaregiverPermission) {
  return (
    PERMISSIONS.find((item) => item.value === permission)?.label ?? permission
  );
}
