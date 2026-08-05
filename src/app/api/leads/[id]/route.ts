import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  source: z
    .enum(["LINKEDIN", "REFERRAL", "INBOUND_INQUIRY", "NETWORKING_EVENT", "COLD_OUTREACH", "OTHER"])
    .optional(),
  stage: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "MEETING_SCHEDULED", "CONVERTED", "DISQUALIFIED"])
    .optional(),
});

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      ...(data.stage && data.stage !== existing.stage ? { stageChangedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ lead });
});
