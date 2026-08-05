import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  await requireUser();
  const placements = await prisma.placement.findMany({
    orderBy: { startDate: "desc" },
    include: { candidate: true, company: true, role: true },
  });
  return NextResponse.json({ placements });
});
