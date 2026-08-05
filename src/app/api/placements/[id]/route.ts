import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "ENDED", "TERMINATED"]).optional(),
  endDate: z.string().nullable().optional(),
  guaranteeDays: z.number().int().positive().optional(),
});

// Ending/terminating a placement here is what feeds the guarantee-triggered
// replacement ticket automation (§1, §6) on the next automation sweep.
export const PATCH = withApiErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = updateSchema.parse(await req.json());

  const placement = await prisma.placement.update({
    where: { id },
    data: {
      ...data,
      endDate: data.endDate === undefined ? undefined : data.endDate ? new Date(data.endDate) : null,
    },
  });

  return NextResponse.json({ placement });
});
