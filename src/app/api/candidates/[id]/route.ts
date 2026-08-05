import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { finalizeUpload } from "@/lib/storage";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  certifications: z.array(z.string()).optional(),
  locationText: z.string().nullable().optional(),
  workArrangement: z.enum(["REMOTE", "ONSITE", "HYBRID"]).nullable().optional(),
  mostRecentCompany: z.string().nullable().optional(),
  mostRecentTitle: z.string().nullable().optional(),
  mostRecentStart: z.string().nullable().optional(),
  mostRecentEnd: z.string().nullable().optional(),
  yearsOfExperience: z.number().nullable().optional(),
  assignedRecruiterId: z.string().nullable().optional(),
  stage: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
  tempResumeKey: z.string().optional(),
  resumeFileName: z.string().optional(),
});

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      role: { include: { company: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      assignedRecruiter: { select: { id: true, name: true } },
      approvalRequests: { orderBy: { createdAt: "desc" }, include: { requestedBy: { select: { name: true } } } },
      placement: true,
    },
  });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ candidate });
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stage, mostRecentStart, mostRecentEnd, tempResumeKey, resumeFileName, ...rest } = data;

  let resumeUpdate = {};
  if (tempResumeKey) {
    const storageKey = await finalizeUpload(tempResumeKey, id);
    resumeUpdate = {
      resumeFileUrl: storageKey,
      resumeFileName: resumeFileName,
      resumeParsedAt: new Date(),
      resumeParseFailed: false,
    };
  }

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      ...rest,
      ...resumeUpdate,
      mostRecentStart: mostRecentStart === undefined ? undefined : mostRecentStart ? new Date(mostRecentStart) : null,
      mostRecentEnd: mostRecentEnd === undefined ? undefined : mostRecentEnd ? new Date(mostRecentEnd) : null,
      ...(stage && stage !== existing.stage
        ? { stage, stageChangedAt: new Date() }
        : {}),
    },
  });

  if (stage === "HIRED" && existing.stage !== "HIRED") {
    const role = await prisma.role.findUniqueOrThrow({ where: { id: existing.roleId } });
    await prisma.placement.upsert({
      where: { candidateId: id },
      create: {
        candidateId: id,
        roleId: existing.roleId,
        companyId: role.companyId,
        startDate: new Date(),
      },
      update: {},
    });
    if (role.status !== "FILLED") {
      await prisma.role.update({
        where: { id: role.id },
        data: { status: "FILLED", dateFilled: new Date() },
      });
    }
  }

  return NextResponse.json({ candidate });
});
