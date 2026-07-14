"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetlistEntry } from "@/lib/types";
import { formatSegment } from "@/lib/format";

const PHASE_BADGE: Record<string, string> = {
  warmup: "bg-blue-500/20 text-blue-300",
  build: "bg-amber-500/20 text-amber-300",
  peak: "bg-rose-500/20 text-rose-300",
  cooldown: "bg-purple-500/20 text-purple-300",
};

function Row({
  entry,
  index,
  isPlaying,
  onToggleLock,
  onRemove,
}: {
  entry: SetlistEntry;
  index: number;
  isPlaying: boolean;
  onToggleLock: (uri: string) => void;
  onRemove: (uri: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.spotify_uri,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
        isPlaying
          ? "border-booth-accent/60 bg-booth-accent/10"
          : "border-booth-border bg-booth-panel2"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab select-none text-booth-dim hover:text-booth-text active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div className="w-6 shrink-0 pt-1 text-center text-xs text-booth-dim">{index + 1}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-booth-text">{entry.title}</span>
          <span className="truncate text-sm text-booth-dim">{entry.artist}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${PHASE_BADGE[entry.phase] ?? ""}`}>
            {entry.phase}
          </span>
          <span className="text-[11px] text-booth-dim">
            {entry.estimated_bpm} bpm · energy {entry.energy_1_to_10}/10
          </span>
          {formatSegment(entry.start_ms, entry.end_ms) && (
            <span className="rounded bg-booth-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-booth-warn">
              ✂ {formatSegment(entry.start_ms, entry.end_ms)}
            </span>
          )}
        </div>
        {entry.transition_note && (
          <p className="mt-1 text-xs italic text-booth-dim">↳ {entry.transition_note}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => onToggleLock(entry.spotify_uri)}
          title={entry.locked ? "Unlock" : "Lock in place"}
          className={`rounded px-2 py-1 text-sm ${
            entry.locked ? "bg-booth-accent2/20 text-booth-accent2" : "text-booth-dim hover:text-booth-text"
          }`}
        >
          {entry.locked ? "🔒" : "🔓"}
        </button>
        <button
          onClick={() => onRemove(entry.spotify_uri)}
          title="Remove from set"
          className="rounded px-2 py-1 text-sm text-booth-dim hover:text-booth-danger"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function SetlistEditor({
  entries,
  playingUri,
  onReorder,
  onToggleLock,
  onRemove,
}: {
  entries: SetlistEntry[];
  playingUri?: string;
  onReorder: (next: SetlistEntry[]) => void;
  onToggleLock: (uri: string) => void;
  onRemove: (uri: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.spotify_uri === active.id);
    const newIndex = entries.findIndex((e) => e.spotify_uri === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(entries, oldIndex, newIndex));
  }

  if (entries.length === 0) {
    return <div className="rounded-lg border border-booth-border bg-booth-panel p-6 text-center text-sm text-booth-dim">Nothing here yet.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e.spotify_uri)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <Row
              key={entry.spotify_uri}
              entry={entry}
              index={i}
              isPlaying={entry.spotify_uri === playingUri}
              onToggleLock={onToggleLock}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
