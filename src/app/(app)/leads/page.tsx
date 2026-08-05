import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewLeadModal } from "@/components/NewLeadModal";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING_SCHEDULED", "CONVERTED", "DISQUALIFIED"] as const;

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  INBOUND_INQUIRY: "Inbound",
  NETWORKING_EVENT: "Networking event",
  COLD_OUTREACH: "Cold outreach",
  OTHER: "Other",
};

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
  const byStage = Object.fromEntries(STAGES.map((s) => [s, leads.filter((l) => l.stage === s)]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">{leads.length} prospective clients</p>
        </div>
        <NewLeadModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className="bg-white border border-slate-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              {stage.replace("_", " ")} <span className="text-slate-300">({byStage[stage].length})</span>
            </h3>
            <div className="space-y-2">
              {byStage[stage].map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="block bg-slate-50 hover:bg-slate-100 rounded-md p-2 text-sm"
                >
                  <p className="font-medium text-slate-800">{l.companyName}</p>
                  <p className="text-xs text-slate-400">{SOURCE_LABELS[l.source]}</p>
                </Link>
              ))}
              {byStage[stage].length === 0 && <p className="text-xs text-slate-300">—</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
