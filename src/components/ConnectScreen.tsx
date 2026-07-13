"use client";

export default function ConnectScreen({ error }: { error?: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Set <span className="text-booth-accent">Architect</span>
        </h1>
        <p className="max-w-md text-booth-dim">
          An AI DJ for one Spotify playlist at a time. Claude designs the set; Spotify plays it; you steer it live.
        </p>
      </div>
      {error && (
        <div className="max-w-md rounded-lg border border-booth-danger/40 bg-booth-danger/10 px-4 py-2 text-sm text-booth-danger">
          Connection failed: {error}
        </div>
      )}
      <a
        href="/api/auth/login"
        className="rounded-full bg-booth-accent px-6 py-3 font-semibold text-black transition hover:brightness-110"
      >
        Connect Spotify
      </a>
      <p className="max-w-sm text-xs text-booth-dim">
        Requires Spotify Premium. You&rsquo;ll be asked to approve read/write access to playlists and playback
        control only.
      </p>
    </div>
  );
}
