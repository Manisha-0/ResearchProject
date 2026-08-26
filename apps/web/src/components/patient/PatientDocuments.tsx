import { FileText, Sparkles } from "lucide-react";

import type { PatientDocument } from "@/lib/types";

export function PatientDocuments({
  documents,
}: {
  documents: PatientDocument[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        My Documents
      </p>

      <h2 className="mt-1 text-xl font-semibold text-navy-deep">
        Care information
      </h2>

      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Documents added by your navigation team, organized with plain-language
        summaries.
      </p>

      <div className="mt-6 space-y-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="rounded-xl border border-border p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-tint">
                <FileText className="h-4 w-4 text-navy" />
              </div>

              <div>
                <p className="font-semibold text-ink">{document.title}</p>

                <p className="mt-1 text-xs text-ink-soft">
                  Added by {document.uploadedBy}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gold-tint p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-navy" />

                <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                  Plain-language summary
                </p>
              </div>

              <p className="mt-2 text-sm leading-6 text-navy-deep">
                {document.patientFriendlySummary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
