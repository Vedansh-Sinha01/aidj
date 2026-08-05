"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Duplicate = { id: string; name: string; kind: "company" | "lead"; reason: "name" | "domain" };

const SOURCES = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "REFERRAL", label: "Word of mouth / referral" },
  { value: "INBOUND_INQUIRY", label: "Inbound inquiry" },
  { value: "NETWORKING_EVENT", label: "Networking event / conference" },
  { value: "COLD_OUTREACH", label: "Cold outreach" },
  { value: "OTHER", label: "Other" },
];

export function NewLeadModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [source, setSource] = useState("LINKEDIN");
  const [note, setNote] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setCompanyName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setSource("LINKEDIN");
    setNote("");
    setDuplicates(null);
  }

  async function submit(force: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName: contactName || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          source,
          note: note || undefined,
          force,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setDuplicates(data.duplicates);
        return;
      }
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      }
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
        + New lead
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">New lead</h2>

            {duplicates && duplicates.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  This looks similar to {duplicates.length} existing record{duplicates.length > 1 ? "s" : ""}.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {duplicates.map((d) => (
                    <li key={`${d.kind}-${d.id}`}>
                      {d.name} <span className="text-xs text-slate-400">({d.kind}, matched by {d.reason})</span>
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
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Prospective company name"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Contact name (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Contact email (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Contact phone (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={busy || !companyName}
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
