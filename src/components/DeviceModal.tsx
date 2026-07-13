"use client";

export default function DeviceModal({
  devices,
  onChoose,
  onClose,
}: {
  devices: { id: string; name: string; type: string; is_active: boolean }[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-booth-border bg-booth-panel p-5">
        <h3 className="mb-3 text-lg font-semibold">Pick a device</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-booth-dim">
            No active Spotify devices found. Open Spotify on your phone, desktop, or speaker, then try again.
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onChoose(d.id)}
                className="flex w-full items-center justify-between rounded-lg border border-booth-border bg-booth-panel2 px-3 py-2.5 text-left hover:border-booth-accent/60"
              >
                <div>
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-booth-dim">{d.type}</div>
                </div>
                {d.is_active && <span className="text-xs text-booth-accent">active</span>}
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-booth-panel2 py-2 text-sm hover:bg-booth-border">
          Cancel
        </button>
      </div>
    </div>
  );
}
