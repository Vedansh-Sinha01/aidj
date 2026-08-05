import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { getMicrosoftAuthUrl, isMicrosoftIntegrationConfigured } from "@/lib/microsoft-graph";

export const GET = withApiErrors(async () => {
  const user = await requireUser();

  if (!isMicrosoftIntegrationConfigured()) {
    return NextResponse.json(
      { error: "Microsoft integration is not configured on this server. See README for setup." },
      { status: 400 }
    );
  }

  const url = await getMicrosoftAuthUrl(user.id);
  return NextResponse.redirect(url);
});
