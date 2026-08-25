"use client";

import { computePriority } from "@/lib/scoring";
import { useCompassStore } from "@/store/compass-store";

export default function Home() {
  const patients = useCompassStore((state) => state.patients);
  const submitCheckIn = useCompassStore((state) => state.submitCheckIn);
  const resolveGap = useCompassStore((state) => state.resolveGap);
  const resetDemo = useCompassStore((state) => state.resetDemo);
  const maria = patients.find((patient) => patient.id === "maria-johnson");

  if (!maria) {
    return null;
  }

  const priority = computePriority(maria);

  const transportGap = maria.careGaps.find(
    (gap) => gap.type === "transportation" && gap.status !== "resolved",
  );

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-bold">Compass scoring test</h1>

        <div>
          Maria priority:
          <strong className="ml-2">{priority.score}</strong>
        </div>

        <div>
          Tier:
          <strong className="ml-2">{priority.tier}</strong>
        </div>

        <div className="space-y-1">
          {priority.reasons.map((reason) => (
            <div key={reason.key}>
              +{reason.points} {reason.label}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded bg-black px-4 py-2 text-white"
            onClick={() =>
              submitCheckIn("maria-johnson", {
                nausea: "severe",
                transportStatus: "not_sure",
                medicationStatus: "on_track",
                note: "I'm worried I won't be able to make tomorrow's appointment.",
              })
            }
          >
            Submit urgent check-in
          </button>

          {transportGap && (
            <button
              className="rounded border px-4 py-2"
              onClick={() => resolveGap("maria-johnson", transportGap.id)}
            >
              Resolve transportation
            </button>
          )}

          <button className="rounded border px-4 py-2" onClick={resetDemo}>
            Reset demo
          </button>
        </div>
      </div>
    </main>
  );
}
