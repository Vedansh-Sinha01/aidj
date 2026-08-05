import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const resolveSchema = z.object({
  action: z.enum(["approve", "decline"]),
});

export const PATCH = withApiErrors(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { action } = resolveSchema.parse(await req.json());

    const approval = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!approval) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (approval.status !== "PENDING") {
      return NextResponse.json({ error: "Already resolved" }, { status: 409 });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "DECLINED",
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ approval: updated });
  }
);
