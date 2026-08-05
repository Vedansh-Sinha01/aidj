import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { readResume } from "@/lib/storage";

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate?.resumeFileUrl) return NextResponse.json({ error: "No résumé on file" }, { status: 404 });

  const buffer = await readResume(candidate.resumeFileUrl);
  if (!buffer) return NextResponse.json({ error: "File missing from storage" }, { status: 404 });

  const contentType = candidate.resumeFileUrl.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${candidate.resumeFileName ?? "resume"}"`,
    },
  });
});
