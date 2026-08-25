import type { PriorityTier } from "@/lib/types";

type PriorityBadgeProps = {
  score: number;
  tier: PriorityTier;
};

const styles: Record<PriorityTier, string> = {
  high: "bg-priority-high-tint text-priority-high border-priority-high/20",

  medium:
    "bg-priority-medium-tint text-priority-medium border-priority-medium/20",

  low: "bg-priority-low-tint text-priority-low border-priority-low/20",
};

const labels: Record<PriorityTier, string> = {
  high: "High",
  medium: "Needs attention",
  low: "On track",
};

export function PriorityBadge({ score, tier }: PriorityBadgeProps) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        "text-xs font-semibold",
        styles[tier],
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          tier === "high"
            ? "bg-priority-high"
            : tier === "medium"
              ? "bg-priority-medium"
              : "bg-priority-low",
        ].join(" ")}
      />

      <span>{labels[tier]}</span>

      <span className="opacity-60">·</span>

      <span>{score}</span>
    </div>
  );
}
