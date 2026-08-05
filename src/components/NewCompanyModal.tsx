"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Duplicate = { id: string; name: string; kind: "company" | "lead"; reason: "name" | "domain" };

export function NewCompanyModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setIndustry("");
    setTags("");
    setContactEmail("");
    setDuplicates(null);
    setError(null);
  }

  async function submit(force: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry: industry || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          contactEmail: contactEmail || undefined,
          force,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setDuplicates(data.duplicates);
        return;
      }
      if (!res.ok) {
        setError("Could not create company.");
        return;
      }
      const data = await res.json();
      setOpen(false);
      reset();
      router.push(`/companies/${data.company.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800"
      >
        + New company
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">New company</h2>

            {duplicates && duplicates.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  This looks similar to {duplicates.length} existing record
                  {duplicates.length > 1 ? "s" : ""}. Double-check before creating a duplicate.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {duplicates.map((d) => (
                    <li key={`${d.kind}-${d.id}`} className="flex items-center justify-between">
                      <span>
                        {d.name}{" "}
                        <span className="text-xs text-slate-400">
                          ({d.kind}, matched by {d.reason})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 mt-5">
                  <button
                    disabled={busy}
                    onClick={() => submit(true)}
                    className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
                  >
                    Create anyway
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
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Industry (optional)</label>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tags / segments (comma-separated)
                  </label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="IT Staffing, Healthcare"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    A contact email (optional, improves duplicate detection)
                  </label>
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={busy || !name}
                    onClick={() => submit(false)}
                    className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
                  >
                    Create
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
