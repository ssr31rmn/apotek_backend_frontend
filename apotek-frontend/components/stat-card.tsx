type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "teal" | "amber" | "red" | "slate";
};

export function StatCard({
  label,
  value,
  helper,
  tone = "slate",
}: StatCardProps) {
  const accents = {
    teal: "border-l-teal-600",
    amber: "border-l-amber-500",
    red: "border-l-red-500",
    slate: "border-l-slate-400",
  };
  return (
    <div
      className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${accents[tone]}`}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
