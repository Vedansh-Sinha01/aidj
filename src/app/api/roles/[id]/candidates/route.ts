import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { finalizeUpload } from "@/lib/storage";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  locationText: z.string().optional(),
  workArrangement: z.enum(["REMOTE", "ONSITE", "HYBRID"]).optional(),
  mostRecentCompany: z.string().optional(),
  mostRecentTitle: z.string().optional(),
  mostRecentStart: z.string().optional(), // ISO date
  mostRecentEnd: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  assignedRecruiterId: z.string().optional(),
  tempResumeKey: z.string().optional(),
  resumeFileName: z.string().optional(),
  resumeParseFailed: z.boolean().default(false),
});

export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: roleId } = await ctx.params;
  const data = createSchema.parse(await req.json());

  const candidate = await prisma.candidate.create({
    data: {
      roleId,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      certifications: data.certifications,
      locationText: data.locationText,
      workArrangement: data.workArrangement,
      mostRecentCompany: data.mostRecentCompany,
      mostRecentTitle: data.mostRecentTitle,
      mostRecentStart: data.mostRecentStart ? new Date(data.mostRecentStart) : undefined,
      mostRecentEnd: data.mostRecentEnd ? new Date(data.mostRecentEnd) : undefined,
      yearsOfExperience: data.yearsOfExperience,
      assignedRecruiterId: data.assignedRecruiterId ?? user.id,
      resumeParseFailed: data.resumeParseFailed,
    },
  });

  if (data.tempResumeKey) {
    const storageKey = await finalizeUpload(data.tempResumeKey, candidate.id);
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        resumeFileUrl: storageKey,
        resumeFileName: data.resumeFileName,
        resumeParsedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ candidate }, { status: 201 });
});
