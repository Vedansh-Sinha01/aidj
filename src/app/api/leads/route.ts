import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { findPotentialDuplicates } from "@/lib/duplicate-detection";

const createSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  source: z.enum([
    "LINKEDIN",
    "REFERRAL",
    "INBOUND_INQUIRY",
    "NETWORKING_EVENT",
    "COLD_OUTREACH",
    "OTHER",
  ]),
  note: z.string().optional(),
  force: z.boolean().default(false),
});

export const GET = withApiErrors(async () => {
  await requireUser();
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ leads });
});

export const POST = withApiErrors(async (req: Request) => {
  const user = await requireUser();
  const data = createSchema.parse(await req.json());

  if (!data.force) {
    const duplicates = await findPotentialDuplicates(data.companyName, data.contactEmail);
    if (duplicates.length > 0) {
      return NextResponse.json({ duplicates }, { status: 409 });
    }
  }

  const lead = await prisma.lead.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone,
      source: data.source,
      notes: data.note ? { create: { body: data.note, authorId: user.id } } : undefined,
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
});
