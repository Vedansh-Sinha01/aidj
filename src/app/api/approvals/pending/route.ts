import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  await requireUser();

  const pending = await prisma.approvalRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      candidate: {
        include: { role: { include: { company: true } } },
      },
      requestedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ pending });
});
