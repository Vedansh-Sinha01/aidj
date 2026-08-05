import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { getCompanyKpis } from "@/lib/kpi";
import { getRelationshipScore } from "@/lib/relationship-score";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      roles: { orderBy: { createdAt: "desc" }, include: { _count: { select: { candidates: true } } } },
      satisfactionNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
      activityLogs: { orderBy: { occurredAt: "desc" }, take: 15 },
      invoices: user.role === "MANAGER" ? { orderBy: { dateInvoiced: "desc" } } : false,
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [kpis, relationshipScore] = await Promise.all([
    getCompanyKpis(id, user.role),
    getRelationshipScore(id),
  ]);

  return NextResponse.json({ company, kpis, relationshipScore });
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const company = await prisma.company.update({ where: { id }, data });
  return NextResponse.json({ company });
});
