"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  type ChangeEvent,
  SubmitEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ApiError } from "@/lib/api";

import {
  createDocumentAccess,
  deletePatientDocument,
  getPatientDocuments,
  uploadPatientDocument,
} from "@/lib/document-api";

import { useAuthStore } from "@/store/auth-store";

import type { DocumentType, PatientDocument } from "@/types/document";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES: {
  value: DocumentType;
  label: string;
}[] = [
  {
    value: "referral",
    label: "Referral",
  },
  {
    value: "care_plan",
    label: "Care Plan",
  },
  {
    value: "discharge_instructions",
    label: "Discharge Instructions",
  },
  {
    value: "administrative",
    label: "Administrative",
  },
  {
    value: "other",
    label: "Other",
  },
];

export function PatientDocuments({ patientId }: { patientId: string }) {
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);

  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );

  const [documentToDelete, setDocumentToDelete] =
    useState<PatientDocument | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleError = useCallback(
    (caughtError: unknown, fallback: string) => {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        logout();

        router.replace("/login");

        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : fallback);
    },
    [logout, router],
  );

  const loadDocuments = useCallback(async () => {
    setError(null);

    try {
      const result = await getPatientDocuments(patientId);

      setDocuments(result);
    } catch (caughtError) {
      handleError(caughtError, "Unable to load patient documents.");
    } finally {
      setIsLoading(false);
    }
  }, [handleError, patientId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDocuments() {
      try {
        const result = await getPatientDocuments(patientId);

        if (!cancelled) {
          setDocuments(result);
        }
      } catch (caughtError) {
        if (!cancelled) {
          handleError(caughtError, "Unable to load patient documents.");
        }
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
  }, [handleError, patientId]);

  async function handleOpenDocument(document: PatientDocument) {
    setOpeningDocumentId(document.id);

    setError(null);

    try {
      const result = await createDocumentAccess(patientId, document.id);

      const link = window.document.createElement("a");

      link.href = result.url;

      link.target = "_blank";

      link.rel = "noopener noreferrer";

      window.document.body.appendChild(link);

      link.click();

      link.remove();
    } catch (caughtError) {
      handleError(caughtError, "Unable to open the document.");
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!documentToDelete) {
      return;
    }

    setIsDeleting(true);

    setError(null);

    try {
      await deletePatientDocument(patientId, documentToDelete.id);

      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (document) => document.id !== documentToDelete.id,
        ),
      );

      setDocumentToDelete(null);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        logout();

        router.replace("/login");

        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the document.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                Documents
              </p>

              <h2 className="mt-1 font-semibold text-ink">Patient records</h2>

              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Secure documents associated with this patient&apos;s care
                journey.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);

              setIsUploadOpen(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            <Upload className="h-4 w-4" />
            Upload document
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-priority-high-tint p-4 text-sm text-priority-high">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <p>{error}</p>
          </div>
        )}

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="h-5 w-5 animate-spin text-navy" />

              <p className="ml-3 text-sm text-ink-soft">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <EmptyDocuments />
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  isOpening={openingDocumentId === document.id}
                  onOpen={() => void handleOpenDocument(document)}
                  onDelete={() => setDocumentToDelete(document)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {isUploadOpen && (
        <UploadDocumentDialog
          patientId={patientId}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={async () => {
            setIsUploadOpen(false);

            await loadDocuments();
          }}
          onUnauthorized={() => {
            logout();

            router.replace("/login");
          }}
        />
      )}

      {documentToDelete && (
        <DeleteDocumentDialog
          document={documentToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setDocumentToDelete(null);
            }
          }}
          onConfirm={() => void handleDeleteConfirmed()}
        />
      )}
    </>
  );
}

function DocumentCard({
  document,
  isOpening,
  onOpen,
  onDelete,
}: {
  document: PatientDocument;

  isOpening: boolean;

  onOpen: () => void;

  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-navy">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gold-tint px-2.5 py-1 text-[11px] font-semibold text-navy-deep">
                {formatDocumentType(document.document_type)}
              </span>

              {document.patient_visible ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-priority-low-tint px-2.5 py-1 text-[11px] font-semibold text-priority-low">
                  <Eye className="h-3 w-3" />
                  Patient visible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                  <EyeOff className="h-3 w-3" />
                  Navigator only
                </span>
              )}
            </div>

            <p className="mt-2 break-all text-sm font-semibold text-ink">
              {document.original_filename}
            </p>

            <p className="mt-1 text-xs text-ink-soft">
              {formatFileSize(document.file_size_bytes)}

              {" · "}

              {formatDate(document.created_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isOpening}
            onClick={onOpen}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs font-semibold text-navy transition hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOpening ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}

            {isOpening ? "Opening..." : "View PDF"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-priority-high/20 bg-white px-3.5 py-2.5 text-xs font-semibold text-priority-high transition hover:bg-priority-high-tint"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDocumentDialog({
  document,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  document: PatientDocument;

  isDeleting: boolean;

  onCancel: () => void;

  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
        <div className="p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-priority-high-tint text-priority-high">
            <Trash2 className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-ink">
            Delete document?
          </h2>

          <p className="mt-2 text-sm leading-6 text-ink-soft">
            This will remove
            <strong className="mx-1 text-ink">
              {document.original_filename}
            </strong>
            from the patient&apos;s Compass record.
          </p>

          <div className="mt-4 rounded-xl bg-priority-high-tint p-3">
            <p className="text-xs leading-5 text-priority-high">
              This action removes the document metadata and attempts to remove
              the private stored PDF. It cannot be undone from Compass.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onCancel}
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-lg bg-priority-high px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              {isDeleting ? "Deleting..." : "Delete document"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDocuments() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-soft px-5 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy">
        <FileText className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-semibold text-ink">
        No patient documents yet
      </p>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-ink-soft">
        Upload a synthetic referral, care plan, discharge instruction, or
        administrative PDF for this patient.
      </p>
    </div>
  );
}

function UploadDocumentDialog({
  patientId,
  onClose,
  onUploaded,
  onUnauthorized,
}: {
  patientId: string;

  onClose: () => void;

  onUploaded: () => Promise<void>;

  onUnauthorized: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState<DocumentType>("referral");

  const [patientVisible, setPatientVisible] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError(null);

    if (!file) {
      setSelectedFile(null);

      return;
    }

    const lowerName = file.name.toLowerCase();

    if (!lowerName.endsWith(".pdf")) {
      event.target.value = "";

      setSelectedFile(null);

      setError("Only PDF documents are supported.");

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      event.target.value = "";

      setSelectedFile(null);

      setError("The PDF exceeds the 10 MB upload limit.");

      return;
    }

    if (file.size === 0) {
      event.target.value = "";

      setSelectedFile(null);

      setError("The selected PDF is empty.");

      return;
    }

    setSelectedFile(file);
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a PDF document to upload.");

      return;
    }

    setError(null);

    setIsSubmitting(true);

    try {
      await uploadPatientDocument(
        patientId,
        documentType,
        selectedFile,
        patientVisible,
      );

      await onUploaded();
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        onUnauthorized();

        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload the document.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Patient Documents
            </p>

            <h2 className="mt-1 text-lg font-semibold text-ink">
              Upload document
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Add a PDF to this patient&apos;s Compass record.
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Document type
            </span>

            <select
              value={documentType}
              disabled={isSubmitting}
              onChange={(event) =>
                setDocumentType(event.target.value as DocumentType)
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10 disabled:opacity-60"
            >
              {DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">PDF document</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              disabled={isSubmitting}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex w-full items-center gap-4 rounded-xl border border-dashed border-border bg-surface-soft p-4 text-left transition hover:border-navy/30 hover:bg-navy-tint/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-navy">
                <Upload className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {selectedFile ? selectedFile.name : "Choose a PDF"}
                </p>

                <p className="mt-1 text-xs text-ink-soft">
                  {selectedFile
                    ? formatFileSize(selectedFile.size)
                    : "PDF files up to 10 MB"}
                </p>
              </div>
            </button>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-soft p-4">
            <input
              type="checkbox"
              checked={patientVisible}
              disabled={isSubmitting}
              onChange={(event) => setPatientVisible(event.target.checked)}
              className="mt-1 h-4 w-4 accent-navy"
            />

            <div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-navy" />

                <p className="text-sm font-semibold text-ink">
                  Share with patient
                </p>
              </div>

              <p className="mt-1 text-xs leading-5 text-ink-soft">
                When enabled, the patient can view this document. An authorized
                caregiver may also view it when they have document permission.
              </p>
            </div>
          </label>

          {!patientVisible && (
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-surface-soft p-3">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />

              <div>
                <p className="text-xs font-semibold text-ink">Navigator only</p>

                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  This document will not appear in the patient or caregiver
                  portal.
                </p>
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-priority-low-tint p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-priority-low" />

              <div>
                <p className="text-xs font-semibold text-priority-low">
                  Ready to upload
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  The document will remain in private storage and can only be
                  accessed through Compass authorization.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-priority-high-tint p-3 text-sm text-priority-high">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}

              {isSubmitting ? "Uploading..." : "Upload document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDocumentType(type: DocumentType) {
  const labels: Record<DocumentType, string> = {
    referral: "Referral",

    care_plan: "Care Plan",

    discharge_instructions: "Discharge Instructions",

    administrative: "Administrative",

    other: "Other",
  };

  return labels[type];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
