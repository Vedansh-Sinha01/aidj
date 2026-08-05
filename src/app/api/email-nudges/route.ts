import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

// §6 — "Log this as a ticket?" nudge: shown when an email arrives from a
// known client contact via the Outlook sync. Purely a dismissible prompt,
// never an auto-created ticket.
export const GET = withApiErrors(async () => {
  await requireUser();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const nudges = await prisma.activityLog.findMany({
    where: {
      type: "EMAIL",
      direction: "incoming",
      source: "OUTLOOK",
      ticketPrompted: false,
      occurredAt: { gte: sevenDaysAgo },
    },
    orderBy: { occurredAt: "desc" },
    take: 10,
    include: { contact: { select: { name: true } }, company: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ nudges });
});

const dismissSchema = z.object({ id: z.string().min(1) });

export const PATCH = withApiErrors(async (req: Request) => {
  await requireUser();
  const { id } = dismissSchema.parse(await req.json());
  await prisma.activityLog.update({ where: { id }, data: { ticketPrompted: true } });
  return NextResponse.json({ ok: true });
});
