import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "@/components/NewTicketForm";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; candidateId?: string; subject?: string }>;
}) {
  const { companyId, candidateId, subject } = await searchParams;
  const session = await auth();
  const [companies, users] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">New ticket</h1>
      <NewTicketForm
        companies={companies}
        users={users}
        currentUserId={session!.user.id}
        defaultCompanyId={companyId}
        defaultCandidateId={candidateId}
        defaultSubject={subject}
      />
    </div>
  );
}
