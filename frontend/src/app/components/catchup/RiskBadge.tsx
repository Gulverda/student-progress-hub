export default function RiskBadge({
  level,
  score,
}: {
  level: "low" | "medium" | "high";
  score?: number;
}) {
  const config = {
    high: {
      label: "მაღალი რისკი",
      cls: "bg-rose-100 text-rose-700 border border-rose-200",
      dot: "bg-rose-500",
    },
    medium: {
      label: "საშუალო რისკი",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    low: {
      label: "დაბალი რისკი",
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
    },
  };

  const { label, cls, dot } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg ${cls}`}
      title={
        score !== undefined ? `Risk score: ${score.toFixed(2)}` : undefined
      }
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
      {score !== undefined && (
        <span className="opacity-60 font-bold">
          · {Math.round(score * 100)}%
        </span>
      )}
    </span>
  );
}
