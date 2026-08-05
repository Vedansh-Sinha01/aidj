import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadStageSelect } from "@/components/LeadStageSelect";
import { LeadNotes } from "@/components/LeadNotes";

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  REFERRAL: "Word of mouth / referral",
  INBOUND_INQUIRY: "Inbound inquiry",
  NETWORKING_EVENT: "Networking event / conference",
  COLD_OUTREACH: "Cold outreach",
  OTHER: "Other",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });
  if (!lead) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{lead.companyName}</h1>
          <p className="text-sm text-slate-500">{SOURCE_LABELS[lead.source]}</p>
        </div>
        <LeadStageSelect leadId={lead.id} stage={lead.stage} />
      </div>

      {lead.stage === "CONVERTED" && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
          Converted — remember to manually create a new Company record for this client; leads don&apos;t
          auto-convert.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Contact</h2>
        <Row label="Name" value={lead.contactName} />
        <Row label="Email" value={lead.contactEmail} />
        <Row label="Phone" value={lead.contactPhone} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Notes</h2>
        <LeadNotes
          leadId={lead.id}
          notes={lead.notes.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            author: n.author,
          }))}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800 text-right">{value || "—"}</span>
    </div>
  );
}
