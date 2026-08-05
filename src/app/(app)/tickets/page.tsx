import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TICKET_TYPE_LABELS } from "@/lib/ticket-defaults";
import { PriorityBadge, TicketStatusBadge } from "@/components/TicketBadges";

const STATUS_ORDER = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const tickets = await prisma.ticket.findMany({
    where: status ? { status: status as never } : {},
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { company: true, assignedTo: { select: { name: true } }, candidate: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">{tickets.length} tickets</p>
        </div>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800"
        >
          + New ticket
        </Link>
      </div>

      <div className="flex gap-1">
        <FilterLink label="All" href="/tickets" active={!status} />
        {STATUS_ORDER.map((s) => (
          <FilterLink key={s} label={s.replace("_", " ")} href={`/tickets?status=${s}`} active={status === s} />
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Subject</th>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Priority</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/tickets/${t.id}`} className="text-slate-900 font-medium hover:underline">
                    {t.subject}
                  </Link>
                  {!t.priorityConfirmed && (
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                      needs priority confirm
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{t.company.name}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{TICKET_TYPE_LABELS[t.type]}</td>
                <td className="px-4 py-2.5">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-4 py-2.5">
                  <TicketStatusBadge status={t.status} />
                </td>
                <td className="px-4 py-2.5 text-slate-500">{t.assignedTo.name}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No tickets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}
