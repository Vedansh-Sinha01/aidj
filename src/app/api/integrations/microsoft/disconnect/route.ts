import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

export const POST = withApiErrors(async () => {
  const user = await requireUser();
  await prisma.microsoftAccount.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
});
