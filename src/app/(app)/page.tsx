import { auth } from "@/lib/auth";
import { getFirmKpis } from "@/lib/kpi";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const kpis = await getFirmKpis(session!.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Firm-wide snapshot</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Active clients" value={kpis.activeClients} />
        <Kpi label="Dormant clients" value={kpis.dormantClients} />
        <Kpi label="Open job orders" value={kpis.openJobOrders} />
        <Kpi label="Placements (90d)" value={kpis.placementsLast90d} />
        <Kpi label="Fill rate" value={`${kpis.fillRate.toFixed(0)}%`} />
        <Kpi
          label="Avg. time-to-fill"
          value={kpis.avgTimeToFillDays != null ? `${kpis.avgTimeToFillDays.toFixed(0)}d` : "—"}
        />
        {kpis.financials && (
          <>
            <Kpi label="Placement fee revenue" value={`$${kpis.financials.totalRevenue.toLocaleString()}`} />
            <Kpi label="Outstanding AR" value={`$${kpis.financials.outstandingAR.toLocaleString()}`} />
          </>
        )}
      </div>

      {kpis.financials && kpis.financials.revenueConcentration.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Revenue concentration by client</h2>
          <ul className="space-y-2">
            {kpis.financials.revenueConcentration.slice(0, 8).map((r) => (
              <li key={r.companyId} className="flex items-center gap-3 text-sm">
                <Link href={`/companies/${r.companyId}`} className="w-40 truncate text-slate-700 hover:underline">
                  {r.companyName}
                </Link>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900"
                    style={{ width: `${Math.min(100, r.pct)}%` }}
                  />
                </div>
                <span className="text-slate-500 w-12 text-right">{r.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/companies"
          className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300"
        >
          <h3 className="text-sm font-semibold text-slate-900">Client relationship scores →</h3>
          <p className="text-xs text-slate-500 mt-1">
            View computed relationship scores and dormant-client alerts per company.
          </p>
        </Link>
        <Link
          href="/leads"
          className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300"
        >
          <h3 className="text-sm font-semibold text-slate-900">Lead pipeline →</h3>
          <p className="text-xs text-slate-500 mt-1">Track prospective clients through the pipeline.</p>
        </Link>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
