"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddContactForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title: title || undefined,
          email: email || undefined,
          phone: phone || undefined,
          type: type || undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setName("");
        setTitle("");
        setEmail("");
        setPhone("");
        setType("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-slate-900 underline">
        + Add contact
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm col-span-2"
        >
          <option value="">Type (optional)</option>
          <option value="HIRING_MANAGER">Hiring manager</option>
          <option value="HR">HR</option>
          <option value="FINANCE">Finance</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy || !name}
          onClick={submit}
          className="rounded-md bg-slate-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-slate-800 disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
