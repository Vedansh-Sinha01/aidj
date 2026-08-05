import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({ body: z.string().min(1) });

export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: ticketId } = await ctx.params;
  const { body } = createSchema.parse(await req.json());

  const [update] = await prisma.$transaction([
    prisma.ticketUpdate.create({ data: { ticketId, authorId: user.id, body } }),
    prisma.ticket.update({ where: { id: ticketId }, data: { lastActivityAt: new Date() } }),
  ]);

  return NextResponse.json({ update }, { status: 201 });
});
