import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.enum(["HIRING_MANAGER", "HR", "FINANCE", "OTHER"]).optional(),
});

export const POST = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id: companyId } = await ctx.params;
  const data = createSchema.parse(await req.json());

  const contact = await prisma.contact.create({
    data: {
      companyId,
      name: data.name,
      title: data.title,
      email: data.email || undefined,
      phone: data.phone,
      type: data.type,
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
});
