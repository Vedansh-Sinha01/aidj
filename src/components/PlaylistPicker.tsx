"use client";

import { useState } from "react";
import Image from "next/image";

interface PlaylistItem {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
  uri: string;
}

export default function PlaylistPicker({
  playlists,
  loading,
  onSelect,
  onResolveLink,
  onRefresh,
}: {
  playlists: PlaylistItem[];
  loading: boolean;
  onSelect: (id: string) => void;
  onResolveLink: (input: string) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [linkInput, setLinkInput] = useState("");

  const filtered = playlists.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pick the playlist for tonight</h2>
        <button onClick={onRefresh} className="text-xs text-booth-dim hover:text-booth-text" title="Refresh">
          ↻ refresh
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (linkInput.trim()) onResolveLink(linkInput.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          placeholder="Paste a Spotify playlist link or URI…"
          className="flex-1 rounded-lg border border-booth-border bg-booth-panel px-3 py-2 text-sm outline-none focus:border-booth-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-booth-panel2 px-4 py-2 text-sm font-medium hover:bg-booth-border"
        >
          Use link
        </button>
      </form>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your playlists…"
        className="w-full rounded-lg border border-booth-border bg-booth-panel px-3 py-2 text-sm outline-none focus:border-booth-accent"
      />

      {loading ? (
        <div className="py-10 text-center text-sm text-booth-dim">Loading playlists…</div>
      ) : (
        <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex items-center gap-3 rounded-lg border border-booth-border bg-booth-panel2 p-2.5 text-left hover:border-booth-accent/60 hover:bg-booth-panel"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-booth-border">
                {p.imageUrl && (
                  <Image src={p.imageUrl} alt="" width={48} height={48} className="h-12 w-12 object-cover" unoptimized />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-booth-dim">
                  {p.trackCount} tracks · {p.owner}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-booth-dim">No playlists match.</div>
          )}
        </div>
      )}
    </div>
  );
}
