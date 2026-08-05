import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({ body: z.string().min(1) });

export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: candidateId } = await ctx.params;
  const { body } = createSchema.parse(await req.json());

  const note = await prisma.candidateNote.create({
    data: { candidateId, authorId: user.id, body },
  });

  return NextResponse.json({ note }, { status: 201 });
});
