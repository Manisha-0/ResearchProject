"use client";

import {
  AlertCircle,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  HeartHandshake,
  LoaderCircle,
  MapPin,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/AppHeader";

import { CaregiverCheckInForm } from "@/components/caregiver/CaregiverCheckInForm";

import { ApiError } from "@/lib/api";

import {
  confirmCaregiverTransportation,
  createCaregiverDocumentAccess,
  getCaregiverDocuments,
  getCaregiverPortal,
} from "@/lib/caregiver-api";

import { useAuthStore } from "@/store/auth-store";

import type {
  CaregiverDocument,
  CaregiverPermission,
  CaregiverPortalPatient,
  CaregiverPortalResponse,
} from "@/types/caregiver";

export default function CaregiverPage() {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [portal, setPortal] = useState<CaregiverPortalResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [confirmingPatientId, setConfirmingPatientId] = useState<string | null>(
    null,
  );

  const handleRequestError = useCallback(
    (caughtError: unknown) => {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        logout();

        router.replace("/login");

        return true;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load " + "caregiver " + "information.",
      );

      return false;
    },
    [logout, router],
  );

  const loadPortal = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const data = await getCaregiverPortal();

      setPortal(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, [handleRequestError]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPortal() {
      try {
        const data = await getCaregiverPortal();

        if (!cancelled) {
          setPortal(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          handleRequestError(caughtError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchPortal();

    return () => {
      cancelled = true;
    };
  }, [handleRequestError]);

  async function confirmTransportation(patient: CaregiverPortalPatient) {
    if (!hasPermission(patient, "transportation")) {
      return;
    }

    setConfirmingPatientId(patient.patient_id);

    setError(null);

    try {
      await confirmCaregiverTransportation(patient.patient_id);

      const data = await getCaregiverPortal();

      setPortal(data);
    } catch (caughtError) {
      handleRequestError(caughtError);
    } finally {
      setConfirmingPatientId(null);
    }
  }

  return (
    <main className="min-h-screen bg-surface-soft">
      <AppHeader />

      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        {isLoading && <LoadingState />}

        {!isLoading && error && !portal && (
          <ErrorState message={error} onRetry={() => void loadPortal()} />
        )}

        {!isLoading && portal && (
          <>
            <section>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sun-tint">
                  <HeartHandshake className="h-5 w-5 text-pine" />
                </div>

                <div>
                  <p className="text-sm text-ink-soft">Caregiver view</p>

                  <h1 className="font-display text-3xl font-bold text-pine-deep">
                    Welcome, {portal.caregiver_first_name}
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">
                Here&apos;s what you currently have permission to help
                coordinate.
              </p>
            </section>

            {error && (
              <div className="mt-6 rounded-xl bg-priority-high-tint p-4 text-sm text-priority-high">
                {error}
              </div>
            )}

            {portal.patients.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="mt-8 space-y-8">
                {portal.patients.map((patient) => (
                  <PatientAccessCard
                    key={patient.patient_id}
                    patient={patient}
                    isConfirming={confirmingPatientId === patient.patient_id}
                    onConfirmTransportation={() =>
                      void confirmTransportation(patient)
                    }
                    onUnauthorized={handleRequestError}
                  />
                ))}
              </div>
            )}

            <section className="mt-6 rounded-2xl bg-pine p-5 text-white sm:p-6">
              <p className="text-xs font-semibold text-ochre">
                Need help?
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Contact the navigation team</h2>

                  <p className="mt-1 text-sm leading-6 text-white/65">
                    Ask a question about appointments, transportation, or care
                    coordination.
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-ochre" />
              </div>
            </section>

            <p className="mt-7 text-center text-xs leading-5 text-ink-soft">
              Compass uses synthetic demo data. Caregiver access is controlled
              by patient-granted permissions.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function PatientAccessCard({
  patient,
  isConfirming,
  onConfirmTransportation,
  onUnauthorized,
}: {
  patient: CaregiverPortalPatient;

  isConfirming: boolean;

  onConfirmTransportation: () => void;

  onUnauthorized: (error: unknown) => boolean;
}) {
  const canViewAppointments = hasPermission(patient, "appointments");

  const canHelpTransportation = hasPermission(patient, "transportation");

  const canProxyCheckIn = hasPermission(patient, "proxy_check_in");

  const canViewDocuments = hasPermission(patient, "documents");

  const transportationConfirmed = patient.transportation.confirmed;

  return (
    <>
      <section>
        <p className="text-sm text-ink-soft">Helping</p>

        <h2 className="mt-1 font-display text-2xl font-bold text-pine-deep">
          {patient.first_name} {patient.last_name}
        </h2>

        <p className="mt-1 text-sm capitalize text-ink-soft">
          {patient.relationship}
        </p>
      </section>

      {canViewAppointments && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="text-xs font-semibold text-ochre">
              Next appointment
            </p>

            {patient.next_appointment ? (
              <>
                <div className="mt-2 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-pine-deep">
                      {patient.next_appointment.title}
                    </h3>

                    <p className="mt-1 text-sm text-ink-soft">
                      {patient.first_name}
                      &apos;s next appointment
                    </p>
                  </div>

                  <CalendarDays className="h-6 w-6 shrink-0 text-pine" />
                </div>

                <div className="mt-5 space-y-3">
                  <DetailRow
                    icon={<Clock3 />}
                    text={formatDateTime(
                      patient.next_appointment.scheduled_start,
                    )}
                  />

                  {getAppointmentLocation(patient) && (
                    <DetailRow
                      icon={<MapPin />}
                      text={getAppointmentLocation(patient)!}
                    />
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">
                No upcoming appointment is currently available.
              </p>
            )}
          </div>

          {canHelpTransportation && (
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-10 " +
                      "w-10 shrink-0 " +
                      "items-center " +
                      "justify-center " +
                      "rounded-xl",
                    transportationConfirmed
                      ? "bg-priority-low-tint"
                      : "bg-sun-tint",
                  ].join(" ")}
                >
                  <Car
                    className={[
                      "h-5 w-5",
                      transportationConfirmed
                        ? "text-priority-low"
                        : "text-pine",
                    ].join(" ")}
                  />
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-ink">Transportation</p>

                  {transportationConfirmed ? (
                    <>
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-priority-low">
                        <CheckCircle2 className="h-4 w-4" />
                        Transportation confirmed
                      </div>

                      {patient.transportation.confirmed_at && (
                        <p className="mt-2 text-sm leading-6 text-ink-soft">
                          Confirmed{" "}
                          {formatDateTime(patient.transportation.confirmed_at)}.
                        </p>
                      )}

                      <p className="mt-1 text-sm leading-6 text-ink-soft">
                        This update has been shared with the navigation team.
                      </p>
                    </>
                  ) : !patient.next_appointment ? (
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      No transportation confirmation is needed right now because
                      there is no upcoming appointment.
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        Transportation has not been confirmed for the upcoming
                        appointment.
                      </p>

                      <button
                        type="button"
                        disabled={isConfirming}
                        onClick={onConfirmTransportation}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isConfirming ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Car className="h-4 w-4" />
                        )}

                        {isConfirming
                          ? "Sharing " + "update..."
                          : `I can drive ${patient.first_name}`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {canProxyCheckIn && (
        <CaregiverCheckInForm
          patientId={patient.patient_id}
          patientFirstName={patient.first_name}
          relationship={patient.relationship}
        />
      )}

      {canViewDocuments && (
        <CaregiverDocuments patient={patient} onUnauthorized={onUnauthorized} />
      )}

      <PermissionPanel patient={patient} />
    </>
  );
}

function CaregiverDocuments({
  patient,
  onUnauthorized,
}: {
  patient: CaregiverPortalPatient;

  onUnauthorized: (error: unknown) => boolean;
}) {
  const [documents, setDocuments] = useState<CaregiverDocument[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const data = await getCaregiverDocuments(patient.patient_id);

      setDocuments(data);
    } catch (caughtError) {
      if (onUnauthorized(caughtError)) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load " + "shared " + "documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [onUnauthorized, patient.patient_id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDocuments() {
      try {
        const data = await getCaregiverDocuments(patient.patient_id);

        if (!cancelled) {
          setDocuments(data);
        }
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        if (onUnauthorized(caughtError)) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load " + "shared " + "documents.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchDocuments();

    return () => {
      cancelled = true;
    };
  }, [onUnauthorized, patient.patient_id]);

  async function handleOpenDocument(document: CaregiverDocument) {
    setOpeningDocumentId(document.id);

    setError(null);

    try {
      const access = await createCaregiverDocumentAccess(
        patient.patient_id,
        document.id,
      );

      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      if (onUnauthorized(caughtError)) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open " + "the document.",
      );
    } finally {
      setOpeningDocumentId(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine-tint">
          <FileText className="h-5 w-5 text-pine" />
        </div>

        <div>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Documents shared by {patient.first_name}
          </h2>

          <p className="mt-1 text-sm leading-6 text-ink-soft">
            You can view documents that have been shared with the patient and
            included in your caregiver permissions.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-surface-soft p-4 text-sm text-ink-soft">
          <LoaderCircle className="h-4 w-4 animate-spin text-pine" />
          Loading shared documents...
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-5 rounded-xl bg-priority-high-tint p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-priority-high" />

            <div>
              <p className="text-sm text-priority-high">{error}</p>

              <button
                type="button"
                onClick={() => void loadDocuments()}
                className="mt-2 text-xs font-semibold text-priority-high underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && documents.length === 0 && (
        <div className="mt-5 rounded-xl bg-surface-soft p-4">
          <p className="text-sm text-ink-soft">
            No documents have been shared with you yet.
          </p>
        </div>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="mt-5 space-y-3">
          {documents.map((document) => {
            const isOpening = openingDocumentId === document.id;

            return (
              <div
                key={document.id}
                className="rounded-xl border border-border bg-surface-soft p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                        <FileText className="h-4 w-4 text-pine" />
                      </div>

                      <div className="min-w-0">
                        <p className="wrap-break-word text-sm font-semibold text-ink">
                          {document.original_filename}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-pine">
                            {formatDocumentType(document.document_type)}
                          </span>

                          <span className="rounded-full bg-priority-low-tint px-2.5 py-1 text-[11px] font-semibold text-priority-low">
                            Shared
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-ink-soft">
                          {formatFileSize(document.file_size_bytes)}
                          {" · "}
                          {formatDate(document.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isOpening}
                    onClick={() => void handleOpenDocument(document)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isOpening ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}

                    {isOpening ? "Opening..." : "View PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-pine-tint p-3">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-pine" />

        <p className="text-xs leading-5 text-ink-soft">
          Caregiver document access is read-only. Uploading, deleting, and
          navigator-only documents are not available here.
        </p>
      </div>
    </section>
  );
}

function PermissionPanel({ patient }: { patient: CaregiverPortalPatient }) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div>
        <h2 className="mt-1 text-lg font-semibold text-ink">
          What {patient.first_name} has shared with you
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Caregiver access is scoped by category, not all-or-nothing.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Permission
          allowed={hasPermission(patient, "appointments")}
          label="Appointments"
        />

        <Permission
          allowed={hasPermission(patient, "transportation")}
          label="Transportation"
        />

        <Permission
          allowed={hasPermission(patient, "care_tasks")}
          label="Care tasks"
        />

        <Permission
          allowed={hasPermission(patient, "proxy_check_in")}
          label="Proxy check-ins"
        />

        <Permission
          allowed={hasPermission(patient, "documents")}
          label="Documents"
        />

        <Permission label="Clinical notes" />

        <Permission label="Navigator notes" />
      </div>
    </section>
  );
}

function DetailRow({
  icon,
  text,
}: {
  icon: React.ReactNode;

  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft">
      <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-pine">{icon}</span>

      <span>{text}</span>
    </div>
  );
}

function Permission({
  label,
  allowed = false,
}: {
  label: string;

  allowed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-soft px-4 py-3">
      <div className="flex items-center gap-3">
        {allowed ? (
          <Eye className="h-4 w-4 text-priority-low" />
        ) : (
          <EyeOff className="h-4 w-4 text-ink-soft" />
        )}

        <span className="text-sm font-medium text-ink">{label}</span>
      </div>

      {allowed ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-priority-low">
          <Check className="h-3.5 w-3.5" />
          Shared
        </span>
      ) : (
        <span className="text-xs font-medium text-ink-soft">Not shared</span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-pine" />

        <p className="mt-3 text-sm text-ink-soft">
          Loading caregiver access...
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;

  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

        <div>
          <p className="font-semibold text-ink">
            Unable to load caregiver access
          </p>

          <p className="mt-1 text-sm text-ink-soft">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-deep"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-0.5 h-5 w-5 text-pine" />

        <div>
          <p className="font-semibold text-ink">No active patient access</p>

          <p className="mt-2 text-sm leading-6 text-ink-soft">
            You do not currently have an active caregiver relationship.
          </p>
        </div>
      </div>
    </section>
  );
}

function hasPermission(
  patient: CaregiverPortalPatient,

  permission: CaregiverPermission,
) {
  return patient.permissions.includes(permission);
}

function getAppointmentLocation(patient: CaregiverPortalPatient) {
  const appointment = patient.next_appointment;

  if (!appointment) {
    return null;
  }

  return [appointment.location_name, appointment.address_text]
    .filter(Boolean)
    .join(" · ");
}

function formatDocumentType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
