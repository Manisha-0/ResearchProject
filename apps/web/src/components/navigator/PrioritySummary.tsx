type PrioritySummaryProps = {
  high: number;
  medium: number;
  low: number;
};

export function PrioritySummary({ high, medium, low }: PrioritySummaryProps) {
  const items = [
    {
      label: "High priority",
      value: high,
      valueClass: "text-priority-high",
      dotClass: "bg-priority-high",
    },
    {
      label: "Needs attention",
      value: medium,
      valueClass: "text-priority-medium",
      dotClass: "bg-priority-medium",
    },
    {
      label: "On track",
      value: low,
      valueClass: "text-priority-low",
      dotClass: "bg-priority-low",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="
            rounded-2xl
            border
            border-border
            bg-white
            p-5
          "
        >
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />

            <span className="text-sm text-ink-soft">{item.label}</span>
          </div>

          <div className={`mt-3 text-3xl font-bold ${item.valueClass}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
