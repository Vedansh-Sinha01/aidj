import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { saveTempUpload } from "@/lib/storage";
import { extractResumeText, aiExtractResumeFields } from "@/lib/resume-parser";

// Re-upload/replace flow for an existing candidate — same parse-then-review
// contract as the role-level upload (§7).
export const POST = withApiErrors(async (req: Request) => {
  await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { tempKey } = await saveTempUpload(buffer, file.name);

  const extracted = await extractResumeText(buffer, file.name);
  if ("failed" in extracted) {
    return NextResponse.json({
      tempKey,
      fileName: file.name,
      parseFailed: true,
      failureReason: extracted.reason,
      parsed: null,
    });
  }

  const parsed = await aiExtractResumeFields(extracted.text);

  return NextResponse.json({
    tempKey,
    fileName: file.name,
    parseFailed: false,
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    parsed,
  });
});
