import { prisma } from "@/lib/prisma";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * §4 — Client Relationship Score.
 *
 * Weighted formula is fixed by spec:
 *   Communication Responsiveness  x 0.20
 * + Engagement & Collaboration    x 0.20
 * + Client Satisfaction           x 0.25
 * + Business Activity & Growth    x 0.20
 * + Trust & Partnership Strength  x 0.15
 *
 * Each component is normalized to 0-100 below. The exact sub-formulas were
 * left open by the spec ("needs a decision during build") — these are the
 * suggested-starting-point formulas, confirmed for v1. All are system-derived
 * from Outlook/ActivityLog data except Client Satisfaction, which is the one
 * intentionally-manual input (satisfaction notes on the Company record).
 * Tune the thresholds/weights here as real usage data comes in.
 */

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type RelationshipScoreBreakdown = {
  overall: number;
  components: {
    communicationResponsiveness: number;
    engagementAndCollaboration: number;
    clientSatisfaction: number;
    businessActivityAndGrowth: number;
    trustAndPartnershipStrength: number;
  };
  hasSatisfactionData: boolean;
  hasActivityData: boolean;
};

export async function getRelationshipScore(companyId: string): Promise<RelationshipScoreBreakdown> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * MS_PER_DAY);
  const thisQuarterStart = ninetyDaysAgo;
  const priorQuarterStart = new Date(now.getTime() - 180 * MS_PER_DAY);

  const [
    company,
    activities,
    satisfactionNotes,
    openJobOrders,
    placements,
    invoicesThisQuarter,
    invoicesPriorQuarter,
  ] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.activityLog.findMany({ where: { companyId }, orderBy: { occurredAt: "desc" } }),
    prisma.satisfactionNote.findMany({ where: { companyId } }),
    prisma.role.count({ where: { companyId, status: { notIn: ["FILLED", "CLOSED"] } } }),
    prisma.placement.findMany({ where: { companyId } }),
    prisma.invoice.aggregate({
      where: { companyId, dateInvoiced: { gte: thisQuarterStart } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, dateInvoiced: { gte: priorQuarterStart, lt: thisQuarterStart } },
      _sum: { amount: true },
    }),
  ]);

  // --- Communication Responsiveness --------------------------------------
  const lastContact = activities[0]?.occurredAt ?? company.createdAt;
  const daysSinceLastContact = daysBetween(lastContact, now);
  const recencyScore = clamp(100 - (daysSinceLastContact / 60) * 100);

  const responseTimes = activities
    .map((a) => a.responseTimeMinutes)
    .filter((v): v is number => v != null);
  const avgResponseMinutes =
    responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;
  // 0 min -> 100, 24h (1440min) or slower -> 0
  const responsivenessScore =
    avgResponseMinutes != null ? clamp(100 - (avgResponseMinutes / 1440) * 100) : recencyScore;

  const communicationResponsiveness = clamp((recencyScore + responsivenessScore) / 2);

  // --- Engagement and Collaboration ---------------------------------------
  const touchesLast90d = activities.filter((a) => a.occurredAt >= ninetyDaysAgo).length;
  // 12+ touches in the rolling 90-day window -> 100
  const engagementAndCollaboration = clamp((touchesLast90d / 12) * 100);

  // --- Client Satisfaction (manual input — §4 resolved) -------------------
  const avgRating =
    satisfactionNotes.length > 0
      ? satisfactionNotes.reduce((a, b) => a + b.rating, 0) / satisfactionNotes.length
      : null;
  const clientSatisfaction = avgRating != null ? clamp((avgRating / 5) * 100) : 50;

  // --- Business Activity and Growth ----------------------------------------
  const openJobOrdersScore = clamp((openJobOrders / 3) * 100);
  const placementsLastQuarter = placements.filter((p) => p.startDate >= ninetyDaysAgo).length;
  const placementsScore = clamp((placementsLastQuarter / 2) * 100);

  const revThis = Number(invoicesThisQuarter._sum.amount ?? 0);
  const revPrior = Number(invoicesPriorQuarter._sum.amount ?? 0);
  let revenueTrendScore = 50;
  if (revPrior > 0) {
    const growth = (revThis - revPrior) / revPrior;
    revenueTrendScore = clamp(50 + (growth / 0.2) * 50);
  } else if (revThis > 0) {
    revenueTrendScore = 100;
  }

  const businessActivityAndGrowth = clamp(
    (openJobOrdersScore + placementsScore + revenueTrendScore) / 3
  );

  // --- Trust and Partnership Strength ---------------------------------------
  const firstPlacement = placements.length
    ? placements.reduce((min, p) => (p.startDate < min ? p.startDate : min), placements[0].startDate)
    : null;
  const tenureStart = firstPlacement ?? activities.at(-1)?.occurredAt ?? company.createdAt;
  const tenureDays = daysBetween(tenureStart, now);
  // 3+ years tenure -> 100
  const tenureScore = clamp((tenureDays / (365 * 3)) * 100);
  // 5+ total placements (repeat business) -> 100
  const retentionScore = clamp((placements.length / 5) * 100);
  const trustAndPartnershipStrength = clamp((tenureScore + retentionScore) / 2);

  const overall =
    communicationResponsiveness * 0.2 +
    engagementAndCollaboration * 0.2 +
    clientSatisfaction * 0.25 +
    businessActivityAndGrowth * 0.2 +
    trustAndPartnershipStrength * 0.15;

  return {
    overall: Math.round(overall * 10) / 10,
    components: {
      communicationResponsiveness: Math.round(communicationResponsiveness),
      engagementAndCollaboration: Math.round(engagementAndCollaboration),
      clientSatisfaction: Math.round(clientSatisfaction),
      businessActivityAndGrowth: Math.round(businessActivityAndGrowth),
      trustAndPartnershipStrength: Math.round(trustAndPartnershipStrength),
    },
    hasSatisfactionData: satisfactionNotes.length > 0,
    hasActivityData: activities.length > 0,
  };
}
