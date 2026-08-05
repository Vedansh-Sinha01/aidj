import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { syncUserOutlookData } from "@/lib/outlook-sync";

export const POST = withApiErrors(async () => {
  const user = await requireUser();
  const result = await syncUserOutlookData(user.id);
  return NextResponse.json(result);
});
