import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  requirements: z.string().optional(),
});

export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id: companyId } = await ctx.params;
  const data = createSchema.parse(await req.json());

  const role = await prisma.role.create({
    data: { companyId, title: data.title, department: data.department, requirements: data.requirements },
  });

  return NextResponse.json({ role }, { status: 201 });
});
