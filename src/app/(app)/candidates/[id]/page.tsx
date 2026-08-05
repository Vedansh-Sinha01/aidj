import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateStageSelect } from "@/components/CandidateStageSelect";
import { SubmitForApprovalButton } from "@/components/SubmitForApprovalButton";
import { CandidateNotes } from "@/components/CandidateNotes";
import { EditCandidateModal } from "@/components/EditCandidateModal";
import { PlacementPanel } from "@/components/PlacementPanel";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      role: { include: { company: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      assignedRecruiter: { select: { id: true, name: true } },
      approvalRequests: { orderBy: { createdAt: "desc" }, include: { requestedBy: { select: { name: true } }, resolvedBy: { select: { name: true } } } },
      placement: true,
    },
  });
  if (!candidate) notFound();

  const pendingApproval = candidate.approvalRequests.find((a) => a.status === "PENDING");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link href={`/companies/${candidate.role.company.id}`} className="hover:underline">
              {candidate.role.company.name}
            </Link>{" "}
            /{" "}
            <Link href={`/roles/${candidate.role.id}`} className="hover:underline">
              {candidate.role.title}
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{candidate.name}</h1>
            <EditCandidateModal
              candidate={{
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                certifications: candidate.certifications,
                locationText: candidate.locationText,
                workArrangement: candidate.workArrangement,
                mostRecentCompany: candidate.mostRecentCompany,
                mostRecentTitle: candidate.mostRecentTitle,
                yearsOfExperience: candidate.yearsOfExperience,
              }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {candidate.email} {candidate.phone && `· ${candidate.phone}`}
          </p>
        </div>
        <CandidateStageSelect candidateId={candidate.id} stage={candidate.stage} />
      </div>

      {pendingApproval && (
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
          Approval pending — requested by {pendingApproval.requestedBy.name} on{" "}
          {new Date(pendingApproval.createdAt).toLocaleDateString()}.
        </p>
      )}

      {candidate.placement && (
        <PlacementPanel
          placement={{
            id: candidate.placement.id,
            startDate: candidate.placement.startDate.toISOString(),
            guaranteeDays: candidate.placement.guaranteeDays,
            status: candidate.placement.status,
            endDate: candidate.placement.endDate?.toISOString() ?? null,
          }}
        />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Profile</h2>
          <Row label="Location" value={candidate.locationText} />
          <Row label="Work arrangement" value={candidate.workArrangement} />
          <Row label="Most recent role" value={candidate.mostRecentTitle && candidate.mostRecentCompany ? `${candidate.mostRecentTitle} at ${candidate.mostRecentCompany}` : null} />
          <Row
            label="Dates"
            value={
              candidate.mostRecentStart
                ? `${new Date(candidate.mostRecentStart).toLocaleDateString()} – ${
                    candidate.mostRecentEnd ? new Date(candidate.mostRecentEnd).toLocaleDateString() : "present"
                  }`
                : null
            }
          />
          <Row label="Years of experience" value={candidate.yearsOfExperience?.toString()} />
          <Row label="Certifications" value={candidate.certifications.join(", ") || null} />
          <Row label="Assigned recruiter" value={candidate.assignedRecruiter?.name} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Résumé</h2>
          {candidate.resumeFileUrl ? (
            <a
              href={`/api/candidates/${candidate.id}/resume`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {candidate.resumeFileName ?? "View résumé"} →
            </a>
          ) : (
            <p className="text-sm text-slate-400">No résumé on file.</p>
          )}
          {candidate.resumeParseFailed && (
            <p className="text-xs text-amber-600 mt-1">
              Automatic parsing couldn&apos;t read this file — fields were entered manually.
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Client submission</h3>
            {candidate.stage === "HIRED" || candidate.stage === "REJECTED" ? (
              <p className="text-sm text-slate-400">Not applicable at this stage.</p>
            ) : pendingApproval ? (
              <p className="text-sm text-slate-500">Waiting on approval — any team member can approve.</p>
            ) : (
              <SubmitForApprovalButton candidateId={candidate.id} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Notes</h2>
        <CandidateNotes
          candidateId={candidate.id}
          notes={candidate.notes.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            author: n.author,
          }))}
        />
      </div>

      {candidate.approvalRequests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Approval history</h2>
          <ul className="space-y-1 text-sm">
            {candidate.approvalRequests.map((a) => (
              <li key={a.id} className="text-slate-600">
                {new Date(a.createdAt).toLocaleString()} — requested by {a.requestedBy.name} —{" "}
                <span className="font-medium">{a.status}</span>
                {a.resolvedBy && ` by ${a.resolvedBy.name}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800 text-right">{value || "—"}</span>
    </div>
  );
}
