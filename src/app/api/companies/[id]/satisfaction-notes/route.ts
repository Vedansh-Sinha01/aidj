import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

// Any manager can log a satisfaction note after a check-in call (§1, §4).
export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("MANAGER");
  const { id: companyId } = await ctx.params;
  const data = createSchema.parse(await req.json());

  const note = await prisma.satisfactionNote.create({
    data: { companyId, authorId: user.id, rating: data.rating, note: data.note },
  });

  return NextResponse.json({ note }, { status: 201 });
});
