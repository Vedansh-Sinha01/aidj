import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  status: z.enum(["OPEN", "FILLED", "CLOSED"]).optional(),
});

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      company: true,
      candidates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ role });
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const updateData: typeof data & { dateFilled?: Date | null } = { ...data };
  if (data.status === "FILLED") {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing && !existing.dateFilled) updateData.dateFilled = new Date();
  }

  const role = await prisma.role.update({ where: { id }, data: updateData });
  return NextResponse.json({ role });
});
