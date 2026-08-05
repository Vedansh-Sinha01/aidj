"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ParsedFields = {
  name: string | null;
  email: string | null;
  phone: string | null;
  mostRecentCompany: string | null;
  mostRecentTitle: string | null;
  mostRecentStart: string | null;
  mostRecentEnd: string | null;
  yearsOfExperience: number | null;
  certifications: string[];
};

const EMPTY: ParsedFields = {
  name: null,
  email: null,
  phone: null,
  mostRecentCompany: null,
  mostRecentTitle: null,
  mostRecentStart: null,
  mostRecentEnd: null,
  yearsOfExperience: null,
  certifications: [],
};

/**
 * §7 — upload résumé, run AI-assisted extraction, then require the recruiter
 * to review the parsed fields side-by-side with the original file before
 * anything is saved. Never auto-saves.
 */
export function ResumeUploadReview({ roleId }: { roleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [fields, setFields] = useState<ParsedFields>(EMPTY);
  const [locationText, setLocationText] = useState("");
  const [workArrangement, setWorkArrangement] = useState("");
  const [certificationsInput, setCertificationsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("upload");
    setPreviewUrl(null);
    setTempKey(null);
    setFileName(null);
    setParseFailed(false);
    setFailureReason(null);
    setFields(EMPTY);
    setLocationText("");
    setWorkArrangement("");
    setCertificationsInput("");
    setError(null);
  }

  async function onFileSelected(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/roles/${roleId}/candidates/parse-resume`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setTempKey(data.tempKey);
      setFileName(data.fileName);
      setPreviewUrl(`/api/resume-preview/${data.tempKey}`);
      setParseFailed(Boolean(data.parseFailed));
      setFailureReason(data.failureReason ?? null);
      setAiConfigured(data.aiConfigured ?? false);
      if (data.parsed) {
        setFields(data.parsed);
        setCertificationsInput((data.parsed.certifications ?? []).join(", "));
      }
      setStep("review");
    } finally {
      setUploading(false);
    }
  }

  async function skipUpload() {
    setStep("review");
  }

  async function save() {
    if (!fields.name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/roles/${roleId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email || undefined,
          phone: fields.phone || undefined,
          certifications: certificationsInput
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          locationText: locationText || undefined,
          workArrangement: workArrangement || undefined,
          mostRecentCompany: fields.mostRecentCompany || undefined,
          mostRecentTitle: fields.mostRecentTitle || undefined,
          mostRecentStart: fields.mostRecentStart || undefined,
          mostRecentEnd: fields.mostRecentEnd || undefined,
          yearsOfExperience: fields.yearsOfExperience ?? undefined,
          tempResumeKey: tempKey ?? undefined,
          resumeFileName: fileName ?? undefined,
          resumeParseFailed: parseFailed,
        }),
      });
      if (!res.ok) {
        setError("Could not save candidate.");
        return;
      }
      const data = await res.json();
      setOpen(false);
      reset();
      router.push(`/candidates/${data.candidate.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-slate-800"
      >
        + New candidate
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 p-6 my-auto">
            {step === "upload" && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New candidate</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload a résumé (PDF or .docx) to auto-fill fields, or skip and enter details manually.
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
                  className="mt-4 block w-full text-sm"
                />
                {uploading && <p className="text-sm text-slate-500 mt-2">Parsing résumé…</p>}
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={skipUpload}
                    className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
                  >
                    Skip — enter manually
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Review candidate details</h2>
                {parseFailed && failureReason && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                    {failureReason}
                  </p>
                )}
                {!parseFailed && previewUrl && !aiConfigured && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                    AI extraction isn&apos;t configured on this server (no ANTHROPIC_API_KEY) — fields below are
                    blank for manual entry.
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Correct anything the parser got wrong before saving — nothing is saved automatically.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Original résumé</p>
                    {previewUrl ? (
                      <iframe src={previewUrl} className="w-full h-96 border border-slate-200 rounded-md" />
                    ) : (
                      <div className="w-full h-96 border border-dashed border-slate-300 rounded-md flex items-center justify-center text-sm text-slate-400">
                        No résumé uploaded
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    <Field label="Name" value={fields.name ?? ""} onChange={(v) => setFields((f) => ({ ...f, name: v }))} />
                    <Field label="Email" value={fields.email ?? ""} onChange={(v) => setFields((f) => ({ ...f, email: v }))} />
                    <Field label="Phone" value={fields.phone ?? ""} onChange={(v) => setFields((f) => ({ ...f, phone: v }))} />
                    <Field
                      label="Location (city/state)"
                      value={locationText}
                      onChange={setLocationText}
                    />
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
                    <Field
                      label="Most recent company"
                      value={fields.mostRecentCompany ?? ""}
                      onChange={(v) => setFields((f) => ({ ...f, mostRecentCompany: v }))}
                    />
                    <Field
                      label="Most recent title"
                      value={fields.mostRecentTitle ?? ""}
                      onChange={(v) => setFields((f) => ({ ...f, mostRecentTitle: v }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="Start date"
                        type="date"
                        value={fields.mostRecentStart ?? ""}
                        onChange={(v) => setFields((f) => ({ ...f, mostRecentStart: v }))}
                      />
                      <Field
                        label="End date (blank = current)"
                        type="date"
                        value={fields.mostRecentEnd ?? ""}
                        onChange={(v) => setFields((f) => ({ ...f, mostRecentEnd: v }))}
                      />
                    </div>
                    <Field
                      label="Total years of experience"
                      type="number"
                      value={fields.yearsOfExperience?.toString() ?? ""}
                      onChange={(v) => setFields((f) => ({ ...f, yearsOfExperience: v ? Number(v) : null }))}
                    />
                    <Field
                      label="Certifications (comma-separated)"
                      value={certificationsInput}
                      onChange={setCertificationsInput}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="flex gap-2 mt-6">
                  <button
                    disabled={saving}
                    onClick={save}
                    className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save candidate"}
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
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
