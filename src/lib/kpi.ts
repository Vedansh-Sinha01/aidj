import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const DORMANT_THRESHOLD_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type CompanyStatus = "Active" | "Dormant";

/** §5 — per-company KPI block. */
export async function getCompanyKpis(companyId: string, viewerRole: UserRole) {
  const now = new Date();

  const [company, lastActivity, firstActivity, openJobOrders, placements, invoices] =
    await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
      prisma.activityLog.findFirst({
        where: { companyId },
        orderBy: { occurredAt: "desc" },
      }),
      prisma.activityLog.findFirst({
        where: { companyId },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.role.count({
        where: { companyId, status: { not: "FILLED" }, NOT: { status: "CLOSED" } },
      }),
      prisma.placement.findMany({ where: { companyId } }),
      prisma.invoice.findMany({ where: { companyId } }),
    ]);

  const daysSinceLastContact = lastActivity
    ? daysBetween(lastActivity.occurredAt, now)
    : daysBetween(company.createdAt, now);

  const firstPlacement = placements.length
    ? placements.reduce((min, p) => (p.startDate < min ? p.startDate : min), placements[0].startDate)
    : null;
  const tenureStart = firstPlacement ?? firstActivity?.occurredAt ?? company.createdAt;
  const clientTenureDays = daysBetween(tenureStart, now);

  const status: CompanyStatus =
    openJobOrders > 0 || daysSinceLastContact <= DORMANT_THRESHOLD_DAYS ? "Active" : "Dormant";

  const activeContractors = placements.filter((p) => p.status === "ACTIVE").length;

  const base = {
    status,
    daysSinceLastContact,
    clientTenureDays,
    openJobOrders,
    activeContractors,
    totalPlacements: placements.length,
  };

  if (viewerRole !== "MANAGER") return base;

  const outstandingAR = invoices
    .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

  return { ...base, outstandingAR, totalRevenue, invoiceCount: invoices.length };
}

/** Firm-wide dashboard KPIs. */
export async function getFirmKpis(viewerRole: UserRole) {
  const [companies, roles, placements] = await Promise.all([
    prisma.company.findMany({ include: { activityLogs: { orderBy: { occurredAt: "desc" }, take: 1 } } }),
    prisma.role.findMany(),
    prisma.placement.findMany(),
  ]);

  const now = new Date();
  let activeClients = 0;
  let dormantClients = 0;

  for (const c of companies) {
    const lastContact = c.activityLogs[0]?.occurredAt ?? c.createdAt;
    const daysSince = daysBetween(lastContact, now);
    const openRoles = roles.filter(
      (r) => r.companyId === c.id && r.status !== "FILLED" && r.status !== "CLOSED"
    ).length;
    if (openRoles > 0 || daysSince <= DORMANT_THRESHOLD_DAYS) activeClients++;
    else dormantClients++;
  }

  const openJobOrders = roles.filter((r) => r.status !== "FILLED" && r.status !== "CLOSED").length;
  const filledRoles = roles.filter((r) => r.status === "FILLED");
  const fillRate = roles.length > 0 ? (filledRoles.length / roles.length) * 100 : 0;

  const fillTimes = filledRoles
    .filter((r) => r.dateFilled)
    .map((r) => daysBetween(r.dateOpened, r.dateFilled!));
  const avgTimeToFillDays =
    fillTimes.length > 0 ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : null;

  const ninetyDaysAgo = new Date(now.getTime() - 90 * MS_PER_DAY);
  const placementsLast90d = placements.filter((p) => p.startDate >= ninetyDaysAgo).length;

  const result = {
    activeClients,
    dormantClients,
    openJobOrders,
    fillRate,
    avgTimeToFillDays,
    placementsLast90d,
    financials: null as null | {
      totalRevenue: number;
      outstandingAR: number;
      revenueConcentration: { companyId: string; companyName: string; revenue: number; pct: number }[];
    },
  };

  if (viewerRole !== "MANAGER") return result;

  const invoices = await prisma.invoice.findMany({ include: { company: true } });
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const outstandingAR = invoices
    .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const byCompany = new Map<string, { name: string; revenue: number }>();
  for (const inv of invoices) {
    const entry = byCompany.get(inv.companyId) ?? { name: inv.company.name, revenue: 0 };
    entry.revenue += Number(inv.amount);
    byCompany.set(inv.companyId, entry);
  }
  const revenueConcentration = Array.from(byCompany.entries())
    .map(([companyId, v]) => ({
      companyId,
      companyName: v.name,
      revenue: v.revenue,
      pct: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  result.financials = { totalRevenue, outstandingAR, revenueConcentration };
  return result;
}
