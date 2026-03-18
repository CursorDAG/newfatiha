"use client";

export default function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    KICKED: "bg-red-100 text-red-800 border-red-200",
    TRANSFERRED: "bg-blue-100 text-blue-800 border-blue-200",
    REPEATING: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${
        colors[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

