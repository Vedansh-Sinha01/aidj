import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  type: z.enum(["HIRING_MANAGER", "HR", "FINANCE", "OTHER"]).nullable().optional(),
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());
  const contact = await prisma.contact.update({ where: { id }, data });
  return NextResponse.json({ contact });
});

export const DELETE = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
