import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { exchangeCodeForTokens } from "@/lib/microsoft-graph";

export const GET = withApiErrors(async (req: Request) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const settingsUrl = new URL("/settings", process.env.NEXTAUTH_URL || "http://localhost:3000");

  if (!code || state !== user.id) {
    settingsUrl.searchParams.set("microsoft_error", "1");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const { result, serializedCache } = await exchangeCodeForTokens(user.id, code);
    await prisma.microsoftAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        microsoftUserId: result.uniqueId ?? result.account?.homeAccountId ?? "unknown",
        email: result.account?.username ?? "",
        tokenCache: serializedCache,
      },
      update: {
        email: result.account?.username ?? "",
        tokenCache: serializedCache,
      },
    });
    settingsUrl.searchParams.set("microsoft_connected", "1");
  } catch (err) {
    console.error(err);
    settingsUrl.searchParams.set("microsoft_error", "1");
  }

  return NextResponse.redirect(settingsUrl);
});
