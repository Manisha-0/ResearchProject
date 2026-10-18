"use client";

import { FilePlus2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { buildAdministrativeBrief } from "@/lib/admin-ai";
import type { DocumentCategory, Patient } from "@/lib/types";
import { useCompassStore } from "@/store/compass-store";

export function NavigatorAdminPanel({ patient }: { patient: Patient }) {
  const addAppointment = useCompassStore((state) => state.addAppointment);
  const addDocument = useCompassStore((state) => state.addDocument);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const brief = buildAdministrativeBrief(patient);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pine" />

          <p className="text-xs font-semibold text-ochre">
            AI Admin Brief
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink">{brief.headline}</p>

        <div className="mt-4 space-y-2">
          {brief.tasks.map((task) => (
            <div
              key={task}
              className="rounded-xl bg-surface-soft p-3 text-sm leading-6 text-ink-soft"
            >
              {task}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-ink-soft">
          Prototype administrative summary is generated from structured
          synthetic patient data. Production Compass would use the grounded AI
          layer described in the architecture.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="mt-1 font-semibold text-ink">
          Maintain the care journey
        </h2>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => setAppointmentOpen(!appointmentOpen)}
            className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition hover:border-pine/30"
          >
            <Plus className="h-5 w-5 text-pine" />

            <div>
              <p className="text-sm font-semibold text-ink">
                Schedule appointment
              </p>

              <p className="mt-1 text-xs text-ink-soft">
                Adds the appointment to the patient&apos;s Compass journey.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDocumentOpen(!documentOpen)}
            className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition hover:border-pine/30"
          >
            <FilePlus2 className="h-5 w-5 text-pine" />

            <div>
              <p className="text-sm font-semibold text-ink">
                Add care document
              </p>

              <p className="mt-1 text-xs text-ink-soft">
                Adds source information and creates a patient-friendly summary.
              </p>
            </div>
          </button>
        </div>

        {appointmentOpen && (
          <AppointmentForm
            patientId={patient.id}
            onSave={() => setAppointmentOpen(false)}
            addAppointment={addAppointment}
          />
        )}

        {documentOpen && (
          <DocumentForm
            patientId={patient.id}
            onSave={() => setDocumentOpen(false)}
            addDocument={addDocument}
          />
        )}
      </section>
    </div>
  );
}

function AppointmentForm({
  patientId,
  onSave,
  addAppointment,
}: {
  patientId: string;

  onSave: () => void;

  addAppointment: ReturnType<typeof useCompassStore.getState>["addAppointment"];
}) {
  const [title, setTitle] = useState("");

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [location, setLocation] = useState("Ochsner Cancer Center");

  function save() {
    if (!title || !date || !time) {
      return;
    }

    addAppointment(patientId, {
      title,
      date,
      time,
      location,
    });

    onSave();
  }

  return (
    <div className="mt-5 rounded-xl bg-surface-soft p-4">
      <Field label="Appointment" value={title} setValue={setTitle} />

      <Field label="Date" value={date} setValue={setDate} />

      <Field label="Time" value={time} setValue={setTime} />

      <Field label="Location" value={location} setValue={setLocation} />

      <button
        type="button"
        onClick={save}
        className="mt-4 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white"
      >
        Add appointment
      </button>
    </div>
  );
}

function DocumentForm({
  patientId,
  onSave,
  addDocument,
}: {
  patientId: string;

  onSave: () => void;

  addDocument: ReturnType<typeof useCompassStore.getState>["addDocument"];
}) {
  const [title, setTitle] = useState("");

  const [sourceText, setSourceText] = useState("");

  function save() {
    if (!title || !sourceText) {
      return;
    }

    addDocument(patientId, {
      title,

      category: "care_plan" satisfies DocumentCategory,

      fileName: `${title.toLowerCase().replaceAll(" ", "-")}.pdf`,

      sourceText,
    });

    onSave();
  }

  return (
    <div className="mt-5 rounded-xl bg-surface-soft p-4">
      <Field label="Document title" value={title} setValue={setTitle} />

      <label className="mt-4 block text-sm font-semibold text-ink">
        Document text / notes
      </label>

      <textarea
        value={sourceText}
        onChange={(event) => setSourceText(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={save}
        className="mt-4 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white"
      >
        Add and summarize
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;

  value: string;

  setValue: (value: string) => void;
}) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="text-sm font-semibold text-ink">{label}</span>

      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}
