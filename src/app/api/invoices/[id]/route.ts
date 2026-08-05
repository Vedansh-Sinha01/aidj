import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  status: z.enum(["UNPAID", "PAID", "OVERDUE"]).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().optional(),
});

export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("MANAGER");
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paidAt: data.status === "PAID" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ invoice });
});
