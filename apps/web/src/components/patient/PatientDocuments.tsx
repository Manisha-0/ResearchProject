import {
  FileText,
} from "lucide-react";

export function PatientDocuments() {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        My Documents
      </p>

      <h2 className="mt-1 text-xl font-semibold text-navy-deep">
        Care information
      </h2>

      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Documents shared by your
        navigation team will appear here.
      </p>

      <div className="mt-6 rounded-xl bg-surface-soft p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-tint">
            <FileText className="h-4 w-4 text-navy" />
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">
              No documents available
            </p>

            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Patient document access has
              not yet been connected to the
              Compass API.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}