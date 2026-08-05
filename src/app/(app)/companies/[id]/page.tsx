import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyKpis } from "@/lib/kpi";
import { getRelationshipScore } from "@/lib/relationship-score";
import { AddContactForm } from "@/components/AddContactForm";
import { AddSatisfactionNoteForm } from "@/components/AddSatisfactionNoteForm";
import { NewRoleModal } from "@/components/NewRoleModal";
import { AmountOwedPanel } from "@/components/AmountOwedPanel";
import { ComposeEmailButton } from "@/components/ComposeEmailButton";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const isManager = session!.user.role === "MANAGER";

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      roles: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { candidates: true } } },
      },
      satisfactionNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      tickets: { orderBy: { createdAt: "desc" }, take: 10, include: { assignedTo: { select: { name: true } } } },
      activityLogs: { orderBy: { occurredAt: "desc" }, take: 15, include: { contact: { select: { name: true } } } },
      invoices: isManager ? { orderBy: { dateInvoiced: "desc" } } : false,
    },
  });
  if (!company) notFound();

  const [kpis, score] = await Promise.all([getCompanyKpis(id, session!.user.role), getRelationshipScore(id)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
            <span
              className={
                kpis.status === "Active"
                  ? "text-xs font-medium text-emerald-700 bg-emerald-50 rounded px-2 py-0.5"
                  : "text-xs font-medium text-slate-500 bg-slate-100 rounded px-2 py-0.5"
              }
            >
              {kpis.status}
            </span>
          </div>
          {company.industry && <p className="text-sm text-slate-500">{company.industry}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {company.tags.map((t) => (
              <span key={t} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
        <ComposeEmailButton companyId={company.id} contacts={company.contacts} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Days since last contact" value={kpis.daysSinceLastContact} />
        <Stat label="Client tenure" value={`${kpis.clientTenureDays}d`} />
        <Stat label="Open job orders" value={kpis.openJobOrders} />
        <Stat label="Active contractors" value={kpis.activeContractors} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Client Relationship Score</h2>
            <span className="text-2xl font-semibold text-slate-900">{score.overall}</span>
          </div>
          <div className="space-y-2 mt-3">
            <ScoreBar label="Communication responsiveness (20%)" value={score.components.communicationResponsiveness} />
            <ScoreBar label="Engagement & collaboration (20%)" value={score.components.engagementAndCollaboration} />
            <ScoreBar label="Client satisfaction (25%)" value={score.components.clientSatisfaction} />
            <ScoreBar label="Business activity & growth (20%)" value={score.components.businessActivityAndGrowth} />
            <ScoreBar label="Trust & partnership strength (15%)" value={score.components.trustAndPartnershipStrength} />
          </div>
          {!score.hasSatisfactionData && (
            <p className="text-xs text-amber-600 mt-3">No satisfaction notes logged yet — satisfaction defaults to neutral (50).</p>
          )}
        </div>

        {isManager && "outstandingAR" in kpis && (
          <AmountOwedPanel
            invoices={(company.invoices ?? []).map((i) => ({
              id: i.id,
              amount: i.amount.toString(),
              dateInvoiced: i.dateInvoiced.toISOString(),
              dueDate: i.dueDate.toISOString(),
              status: i.status,
            }))}
          />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Contacts</h2>
          <ul className="space-y-2 mb-3">
            {company.contacts.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium text-slate-800">{c.name}</span>
                {c.title && <span className="text-slate-400"> — {c.title}</span>}
                {c.type && (
                  <span className="text-xs text-slate-400 ml-1">({c.type.replace("_", " ").toLowerCase()})</span>
                )}
                <div className="text-xs text-slate-500">
                  {c.email} {c.phone && `· ${c.phone}`}
                </div>
              </li>
            ))}
            {company.contacts.length === 0 && <p className="text-sm text-slate-400">No contacts yet.</p>}
          </ul>
          <AddContactForm companyId={company.id} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Satisfaction notes</h2>
          <ul className="space-y-2 mb-3">
            {company.satisfactionNotes.map((n) => (
              <li key={n.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                <span className="font-medium text-slate-800">{n.rating}/5</span>
                <span className="text-xs text-slate-400 ml-2">
                  {n.author.name} · {new Date(n.createdAt).toLocaleDateString()}
                </span>
                {n.note && <p className="text-slate-600 mt-0.5">{n.note}</p>}
              </li>
            ))}
            {company.satisfactionNotes.length === 0 && (
              <p className="text-sm text-slate-400">No satisfaction notes logged yet.</p>
            )}
          </ul>
          {isManager ? (
            <AddSatisfactionNoteForm companyId={company.id} />
          ) : (
            <p className="text-xs text-slate-400">Only managers can log satisfaction notes.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900">Roles / job orders</h2>
          <NewRoleModal companyId={company.id} />
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="text-left py-1 font-medium">Title</th>
              <th className="text-left py-1 font-medium">Status</th>
              <th className="text-left py-1 font-medium">Candidates</th>
              <th className="text-left py-1 font-medium">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {company.roles.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2">
                  <Link href={`/roles/${r.id}`} className="text-slate-900 font-medium hover:underline">
                    {r.title}
                  </Link>
                  {r.department && <span className="text-xs text-slate-400 ml-1">({r.department})</span>}
                </td>
                <td className="py-2">
                  <RoleStatusBadge status={r.status} />
                </td>
                <td className="py-2 text-slate-600">{r._count.candidates}</td>
                <td className="py-2 text-slate-500">{new Date(r.dateOpened).toLocaleDateString()}</td>
              </tr>
            ))}
            {company.roles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  No roles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Recent tickets</h2>
            <Link href="/tickets" className="text-xs text-slate-400 hover:text-slate-700">
              View all →
            </Link>
          </div>
          <ul className="space-y-2">
            {company.tickets.map((t) => (
              <li key={t.id} className="text-sm">
                <Link href={`/tickets/${t.id}`} className="text-slate-800 hover:underline">
                  {t.subject}
                </Link>
                <div className="text-xs text-slate-400">
                  {t.status} · {t.priority} · assigned to {t.assignedTo.name}
                </div>
              </li>
            ))}
            {company.tickets.length === 0 && <p className="text-sm text-slate-400">No tickets.</p>}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Activity log</h2>
          <ul className="space-y-2">
            {company.activityLogs.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="text-slate-800">
                  {a.type} {a.subject && `— ${a.subject}`}
                </span>
                <div className="text-xs text-slate-400">
                  {new Date(a.occurredAt).toLocaleString()} {a.contact && `· ${a.contact.name}`} ·{" "}
                  {a.source === "OUTLOOK" ? "synced from Outlook" : "manual"}
                </div>
              </li>
            ))}
            {company.activityLogs.length === 0 && (
              <p className="text-sm text-slate-400">
                No activity logged yet. Connect Outlook in Settings to auto-log emails/meetings.
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RoleStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700",
    FILLED: "bg-emerald-50 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs font-medium rounded px-2 py-0.5 ${map[status]}`}>{status}</span>;
}
