import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResumeUploadReview } from "@/components/ResumeUploadReview";
import { FindMatchesButton } from "@/components/FindMatchesButton";
import { RoleStatusSelect } from "@/components/RoleStatusSelect";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      company: true,
      candidates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!role) notFound();

  const byStage = Object.fromEntries(STAGES.map((s) => [s, role.candidates.filter((c) => c.stage === s)]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link href={`/companies/${role.company.id}`} className="hover:underline">
              {role.company.name}
            </Link>
          </p>
          <h1 className="text-xl font-semibold text-slate-900">{role.title}</h1>
          <p className="text-sm text-slate-500">
            {role.department && `${role.department} · `}
            Opened {new Date(role.dateOpened).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleStatusSelect roleId={role.id} status={role.status} />
          <ResumeUploadReview roleId={role.id} />
        </div>
      </div>

      {role.requirements && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Requirements</h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{role.requirements}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Find Matches</h2>
        <p className="text-xs text-slate-400 mb-2">
          Basic structured matching against this role&apos;s own pipeline only (years of experience,
          certifications, location, most recent title).
        </p>
        <FindMatchesButton roleId={role.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className="bg-white border border-slate-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              {stage} <span className="text-slate-300">({byStage[stage].length})</span>
            </h3>
            <div className="space-y-2">
              {byStage[stage].map((c) => (
                <Link
                  key={c.id}
                  href={`/candidates/${c.id}`}
                  className="block bg-slate-50 hover:bg-slate-100 rounded-md p-2 text-sm"
                >
                  <p className="font-medium text-slate-800">{c.name}</p>
                  {c.yearsOfExperience != null && (
                    <p className="text-xs text-slate-400">{c.yearsOfExperience} yrs exp</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
