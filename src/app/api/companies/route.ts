import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";
import { findPotentialDuplicates } from "@/lib/duplicate-detection";

const createSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  tags: z.array(z.string()).default([]),
  contactEmail: z.string().email().optional(),
  force: z.boolean().default(false),
});

export const GET = withApiErrors(async (req: Request) => {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const tag = searchParams.get("tag")?.trim();

  const companies = await prisma.company.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        tag ? { tags: { has: tag } } : {},
      ],
    },
    include: {
      _count: { select: { roles: true, contacts: true } },
      activityLogs: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ companies });
});

export const POST = withApiErrors(async (req: Request) => {
  await requireUser();
  const data = createSchema.parse(await req.json());

  if (!data.force) {
    const duplicates = await findPotentialDuplicates(data.name, data.contactEmail);
    if (duplicates.length > 0) {
      return NextResponse.json({ duplicates }, { status: 409 });
    }
  }

  const company = await prisma.company.create({
    data: { name: data.name, industry: data.industry, tags: data.tags },
  });

  return NextResponse.json({ company }, { status: 201 });
});
