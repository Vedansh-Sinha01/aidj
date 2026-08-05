import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({
  candidateId: z.string().min(1),
});

export const POST = withApiErrors(async (req: Request) => {
  const user = await requireUser();
  const { candidateId } = createSchema.parse(await req.json());

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { role: { include: { company: true } } },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const [approval] = await prisma.$transaction([
    prisma.approvalRequest.create({
      data: { candidateId, requestedById: user.id },
    }),
    prisma.candidate.update({
      where: { id: candidateId },
      data: { lastSubmittedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ approval }, { status: 201 });
});
