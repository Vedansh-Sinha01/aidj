import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { withApiErrors } from "@/lib/api-utils";

const createSchema = z.object({
  placementId: z.string().min(1),
  amount: z.number().positive(),
  dateInvoiced: z.string().optional(),
  dueDate: z.string().min(1),
});

// §2 — invoices/AR are Manager/CEO-only, enforced server-side (not just hidden in the UI).
export const GET = withApiErrors(async () => {
  await requireUser("MANAGER");
  const invoices = await prisma.invoice.findMany({
    orderBy: { dateInvoiced: "desc" },
    include: { company: true, placement: { include: { candidate: true } } },
  });
  return NextResponse.json({ invoices });
});

export const POST = withApiErrors(async (req: Request) => {
  await requireUser("MANAGER");
  const data = createSchema.parse(await req.json());

  const placement = await prisma.placement.findUnique({ where: { id: data.placementId } });
  if (!placement) return NextResponse.json({ error: "Placement not found" }, { status: 404 });

  const invoice = await prisma.invoice.create({
    data: {
      companyId: placement.companyId,
      placementId: placement.id,
      amount: data.amount,
      dateInvoiced: data.dateInvoiced ? new Date(data.dateInvoiced) : new Date(),
      dueDate: new Date(data.dueDate),
    },
  });

  return NextResponse.json({ invoice }, { status: 201 });
});
