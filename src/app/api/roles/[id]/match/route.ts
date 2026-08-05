import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { scoreCandidateAgainstRole } from "@/lib/candidate-matching";

// §10 — manually triggered, scoped only to this role's own active pipeline
// (never the full historical candidate database).
export const POST = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id: roleId } = await ctx.params;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidates = await prisma.candidate.findMany({
    where: { roleId, stage: { not: "REJECTED" } },
  });

  const matches = candidates
    .map((c) => ({ candidate: c, ...scoreCandidateAgainstRole(c, role.title, role.requirements) }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({
    matches: matches.map((m) => ({
      candidateId: m.candidateId,
      name: m.candidate.name,
      stage: m.candidate.stage,
      score: m.score,
      reasons: m.reasons,
    })),
  });
});
