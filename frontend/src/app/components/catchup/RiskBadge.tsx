export default function RiskBadge({
  level,
}: {
  level: "low" | "medium" | "high";
}) {
  const config = {
    high: { label: "მაღალი რისკი", class: "bg-rose-100 text-rose-600" },
    medium: { label: "საშუალო", class: "bg-amber-100 text-amber-600" },
    low: { label: "დაბალი", class: "bg-emerald-100 text-emerald-600" },
  };
  const { label, class: cls } = config[level];
  return (
    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${cls}`}>
      {label}
    </span>
  );
}
