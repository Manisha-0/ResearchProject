"use client";

import {
  AlertCircle,
  ExternalLink,
  FileText,
  LoaderCircle,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ApiError,
} from "@/lib/api";

import {
  createMyDocumentAccess,
  getMyDocuments,
} from "@/lib/patient-document-api";

import {
  useAuthStore,
} from "@/store/auth-store";

import type {
  DocumentType,
  PatientDocument,
} from "@/types/document";


export function PatientDocuments() {
  const router =
    useRouter();

  const logout =
    useAuthStore(
      (state) =>
        state.logout,
    );

  const [
    documents,
    setDocuments,
  ] =
    useState<
      PatientDocument[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    openingDocumentId,
    setOpeningDocumentId,
  ] =
    useState<
      string | null
    >(null);


  const handleError =
    useCallback(
      (
        caughtError:
          unknown,
        fallback:
          string,
      ) => {
        if (
          caughtError instanceof
            ApiError &&
          caughtError.status ===
            401
        ) {
          logout();

          router.replace(
            "/login",
          );

          return;
        }

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : fallback,
        );
      },
      [
        logout,
        router,
      ],
    );


  useEffect(() => {
    let cancelled =
      false;

    async function loadDocuments() {
      try {
        const result =
          await getMyDocuments();

        if (
          !cancelled
        ) {
          setDocuments(
            result,
          );
        }
      } catch (
        caughtError
      ) {
        if (
          !cancelled
        ) {
          handleError(
            caughtError,
            "Unable to load your documents.",
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoading(
            false,
          );
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [
    handleError,
  ]);


  async function handleOpenDocument(
    document:
      PatientDocument,
  ) {
    setOpeningDocumentId(
      document.id,
    );

    setError(null);

    try {
      const result =
        await createMyDocumentAccess(
          document.id,
        );

      const link =
        window.document
          .createElement(
            "a",
          );

      link.href =
        result.url;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      window.document.body
        .appendChild(
          link,
        );

      link.click();

      link.remove();
    } catch (
      caughtError
    ) {
      handleError(
        caughtError,
        "Unable to open this document.",
      );
    } finally {
      setOpeningDocumentId(
        null,
      );
    }
  }


  return (
    <section className="border-t border-border pt-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine-tint text-pine">
          <FileText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-[1.5rem] font-bold leading-tight text-pine-deep">
            My documents
          </h2>

          <p className="mt-1 text-base leading-6 text-ink-soft">
            Documents your navigation
            team has shared with you.
          </p>
        </div>
      </div>


      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-priority-high-tint p-4 text-base text-priority-high">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            {error}
          </p>
        </div>
      )}


      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-5 w-5 animate-spin text-pine" />

            <p className="ml-3 text-base text-ink-soft">
              Loading documents...
            </p>
          </div>
        ) : documents.length ===
          0 ? (
          <EmptyDocuments />
        ) : (
          <div className="space-y-3">
            {documents.map(
              (
                document,
              ) => (
                <DocumentCard
                  key={
                    document.id
                  }
                  document={
                    document
                  }
                  isOpening={
                    openingDocumentId ===
                    document.id
                  }
                  onOpen={() =>
                    void handleOpenDocument(
                      document,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}


function DocumentCard({
  document,
  isOpening,
  onOpen,
}: {
  document:
    PatientDocument;

  isOpening:
    boolean;

  onOpen:
    () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-pine">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-sun-tint px-2.5 py-1 text-[11px] font-semibold text-pine-deep">
              {formatDocumentType(
                document.document_type,
              )}
            </span>

            <p className="mt-2 break-all text-base font-semibold text-ink">
              {
                document.original_filename
              }
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {formatFileSize(
                document.file_size_bytes,
              )}

              {" · "}

              {formatDate(
                document.created_at,
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={
            isOpening
          }
          onClick={
            onOpen
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm font-semibold text-pine transition hover:bg-pine-tint disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOpening ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}

          {isOpening
            ? "Opening..."
            : "View PDF"}
        </button>
      </div>
    </div>
  );
}


function EmptyDocuments() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-soft px-5 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pine">
        <FileText className="h-5 w-5" />
      </div>

      <p className="mt-4 text-base font-semibold text-ink">
        No shared documents yet
      </p>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-ink-soft">
        Documents shared by your
        navigation team will appear
        here.
      </p>
    </div>
  );
}


function formatDocumentType(
  type: DocumentType,
) {
  const labels: Record<
    DocumentType,
    string
  > = {
    referral:
      "Referral",

    care_plan:
      "Care Plan",

    discharge_instructions:
      "Discharge Instructions",

    administrative:
      "Administrative",

    other:
      "Other",
  };

  return labels[type];
}


function formatFileSize(
  bytes: number,
) {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (
    kilobytes < 1024
  ) {
    return `${kilobytes.toFixed(
      kilobytes >= 100
        ? 0
        : 1,
    )} KB`;
  }

  return `${(
    kilobytes / 1024
  ).toFixed(1)} MB`;
}


function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}