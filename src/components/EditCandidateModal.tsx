"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  certifications: string[];
  locationText: string | null;
  workArrangement: string | null;
  mostRecentCompany: string | null;
  mostRecentTitle: string | null;
  yearsOfExperience: number | null;
};

export function EditCandidateModal({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(candidate.name);
  const [email, setEmail] = useState(candidate.email ?? "");
  const [phone, setPhone] = useState(candidate.phone ?? "");
  const [locationText, setLocationText] = useState(candidate.locationText ?? "");
  const [workArrangement, setWorkArrangement] = useState(candidate.workArrangement ?? "");
  const [mostRecentCompany, setMostRecentCompany] = useState(candidate.mostRecentCompany ?? "");
  const [mostRecentTitle, setMostRecentTitle] = useState(candidate.mostRecentTitle ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(candidate.yearsOfExperience?.toString() ?? "");
  const [certifications, setCertifications] = useState(candidate.certifications.join(", "));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          locationText: locationText || null,
          workArrangement: workArrangement || null,
          mostRecentCompany: mostRecentCompany || null,
          mostRecentTitle: mostRecentTitle || null,
          yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
          certifications: certifications
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 hover:text-slate-900 underline"
      >
        Edit
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Edit candidate</h2>
            <div className="space-y-3">
              <LabeledInput label="Name" value={name} onChange={setName} />
              <LabeledInput label="Email" value={email} onChange={setEmail} />
              <LabeledInput label="Phone" value={phone} onChange={setPhone} />
              <LabeledInput label="Location" value={locationText} onChange={setLocationText} />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Work arrangement</label>
                <select
                  value={workArrangement}
                  onChange={(e) => setWorkArrangement(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  <option value="REMOTE">Remote</option>
                  <option value="ONSITE">Onsite</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <LabeledInput label="Most recent company" value={mostRecentCompany} onChange={setMostRecentCompany} />
              <LabeledInput label="Most recent title" value={mostRecentTitle} onChange={setMostRecentTitle} />
              <LabeledInput
                label="Years of experience"
                type="number"
                value={yearsOfExperience}
                onChange={setYearsOfExperience}
              />
              <LabeledInput label="Certifications (comma-separated)" value={certifications} onChange={setCertifications} />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                disabled={busy}
                onClick={save}
                className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
