import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { readTempUpload } from "@/lib/storage";

export const GET = withApiErrors(async (_req: Request, ctx: { params: Promise<{ tempKey: string }> }) => {
  await requireUser();
  const { tempKey } = await ctx.params;
  const buffer = await readTempUpload(tempKey);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = tempKey.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Content-Disposition": "inline" },
  });
});
