import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedToId: z.string().optional(),
  confirmPriority: z.boolean().optional(),
});

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      company: true,
      candidate: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      updates: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      status: data.status,
      priority: data.priority,
      assignedToId: data.assignedToId,
      priorityConfirmed: data.confirmPriority ? true : undefined,
      lastActivityAt: new Date(),
    },
  });

  return NextResponse.json({ ticket });
});
