import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { getValidAccessToken, sendMailViaGraph } from "@/lib/microsoft-graph";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

// §8 — manual compose/send only. This route is only ever invoked by a human
// clicking "Send" in the compose modal; nothing in this app calls it automatically.
export const POST = withApiErrors(async (req: Request) => {
  const user = await requireUser();
  const data = sendSchema.parse(await req.json());

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Connect your Outlook account in Settings before sending — this app never sends on your behalf without your own connected mailbox.",
      },
      { status: 400 }
    );
  }

  await sendMailViaGraph(accessToken, data.to, data.subject, data.body);

  const sent = await prisma.sentEmail.create({
    data: {
      userId: user.id,
      to: data.to,
      subject: data.subject,
      body: data.body,
      contactId: data.contactId,
      companyId: data.companyId,
    },
  });

  if (data.companyId) {
    await prisma.activityLog.create({
      data: {
        companyId: data.companyId,
        contactId: data.contactId,
        userId: user.id,
        type: "EMAIL",
        subject: data.subject,
        occurredAt: new Date(),
        source: "MANUAL",
        direction: "outgoing",
      },
    });
  }

  return NextResponse.json({ sent }, { status: 201 });
});
