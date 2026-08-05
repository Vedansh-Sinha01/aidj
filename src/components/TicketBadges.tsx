export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH: "bg-red-50 text-red-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs font-medium rounded px-2 py-0.5 ${map[priority]}`}>{priority}</span>;
}

export function TicketStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-purple-50 text-purple-700",
    RESOLVED: "bg-emerald-50 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs font-medium rounded px-2 py-0.5 ${map[status]}`}>{status.replace("_", " ")}</span>;
}
