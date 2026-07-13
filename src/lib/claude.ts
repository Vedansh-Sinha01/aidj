import Anthropic from "@anthropic-ai/sdk";
import type { BenchedTrack, SetlistEntry, SetPlan, SteerAction, Track } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_TRACKS_IN_PROMPT = 3000;

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. See .env.example.");
  return new Anthropic({ apiKey });
}

function serializeTracks(tracks: Track[]): string {
  const capped = tracks.slice(0, MAX_TRACKS_IN_PROMPT);
  const lines = capped.map(
    (t) =>
      `${t.uri}\t${t.title}\t${t.artists.join(", ")}\t${t.album}\t${t.releaseYear ?? "?"}\t${Math.round(
        t.durationMs / 1000
      )}s`
  );
  const header = "uri\ttitle\tartist(s)\talbum\tyear\tduration";
  const note =
    tracks.length > MAX_TRACKS_IN_PROMPT
      ? `\n[NOTE: playlist has ${tracks.length} tracks; showing the first ${MAX_TRACKS_IN_PROMPT}. Only use tracks listed above.]`
      : "";
  return `${header}\n${lines.join("\n")}${note}`;
}

const phaseEnum = ["warmup", "build", "peak", "cooldown"];

function setlistEntrySchema(withMc: boolean) {
  const properties: Record<string, unknown> = {
    spotify_uri: { type: "string", description: "Must exactly match a uri from the provided track pool." },
    title: { type: "string" },
    artist: { type: "string" },
    estimated_bpm: { type: "integer" },
    energy_1_to_10: { type: "integer" },
    phase: { type: "string", enum: phaseEnum },
    transition_note: {
      type: "string",
      description: "One line explaining why this track follows the previous one.",
    },
  };
  const required = [
    "spotify_uri",
    "title",
    "artist",
    "estimated_bpm",
    "energy_1_to_10",
    "phase",
    "transition_note",
  ];
  if (withMc) {
    properties.mc_line = {
      type: "string",
      description: "A short radio-DJ line to read when this track starts.",
    };
    required.push("mc_line");
  }
  return { type: "object", properties, required, additionalProperties: false };
}

function planSchema(withMc: boolean) {
  return {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        setlist: { type: "array", items: setlistEntrySchema(withMc) },
        benched: {
          type: "array",
          items: {
            type: "object",
            properties: {
              spotify_uri: { type: "string" },
              title: { type: "string" },
              artist: { type: "string" },
              reason: { type: "string" },
            },
            required: ["spotify_uri", "title", "artist", "reason"],
            additionalProperties: false,
          },
        },
        summary: { type: "string", description: "One or two sentences describing the set design." },
      },
      required: ["setlist", "benched", "summary"],
      additionalProperties: false,
    },
  } as const;
}

const PLAN_SYSTEM_PROMPT = `You are Set Architect, an AI DJ. You design the *order* of a DJ set from a fixed pool of tracks pulled from one Spotify playlist. You never invent tracks — every entry you return must use a spotify_uri taken verbatim from the track pool you're given.

Design principles:
- Build a deliberate energy arc (unless the brief specifies otherwise): warmup -> build -> peak -> cooldown.
- Use your knowledge of each track's approximate tempo, genre, era, and mood to justify why each track follows the previous one (tempo step, shared mood, key vibe, era bridge, energetic contrast, etc.) — write this as transition_note.
- estimated_bpm and energy_1_to_10 are your best estimate from general knowledge of the track/artist; they don't need to be precise, just musically sensible and internally consistent with the arc.
- If asked for a shorter set than the full pool, choose which tracks make the cut and list the rest in "benched" with a one-line reason each. If no length is specified, use the whole pool (every track appears in either setlist or benched).
- Never invent a track that is not in the pool. Never duplicate a track.
- Respond only via the provided JSON schema.`;

async function requestOnce(system: string, user: string, schema: unknown): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: schema as any },
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") {
    throw new Error("Claude declined to respond to that request.");
  }
  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("Claude returned no text content.");
  return textBlock.text;
}

async function callJson<T>(system: string, user: string, schema: unknown): Promise<T> {
  try {
    const text = await requestOnce(system, user, schema);
    return JSON.parse(text) as T;
  } catch (err) {
    // Retry once with an explicit JSON-only reminder before surfacing the error.
    try {
      const text = await requestOnce(
        system,
        `${user}\n\nIMPORTANT: Your previous response was not valid JSON matching the schema. Respond with ONLY valid JSON matching the schema — no prose, no markdown fences.`,
        schema
      );
      return JSON.parse(text) as T;
    } catch (err2) {
      throw new Error(
        `Claude did not return usable JSON after a retry: ${err2 instanceof Error ? err2.message : String(err2)}`
      );
    }
  }
}

function validateAndClean(plan: SetPlan, pool: Track[]): SetPlan {
  const byUri = new Map(pool.map((t) => [t.uri, t]));
  const seen = new Set<string>();
  const setlist: SetlistEntry[] = [];
  for (const entry of plan.setlist ?? []) {
    if (!byUri.has(entry.spotify_uri)) continue; // hallucinated / invalid URI — drop it
    if (seen.has(entry.spotify_uri)) continue; // dedupe
    seen.add(entry.spotify_uri);
    const mcLine = (entry as any).mc_line as string | undefined;
    setlist.push(mcLine ? { ...entry, mcLine } : entry);
  }
  const benched: BenchedTrack[] = (plan.benched ?? []).filter(
    (b) => byUri.has(b.spotify_uri) && !seen.has(b.spotify_uri)
  );
  return { setlist, benched, summary: plan.summary ?? "" };
}

export async function generateSetPlan(opts: {
  brief: string;
  tracks: Track[];
  targetLengthMinutes?: number;
  mcMode: boolean;
}): Promise<SetPlan> {
  const { brief, tracks, targetLengthMinutes, mcMode } = opts;
  const lengthNote = targetLengthMinutes
    ? `Target set length: about ${targetLengthMinutes} minutes. Select the subset of tracks that best fits this brief and length; bench the rest.`
    : `No target length given — use the entire pool of ${tracks.length} tracks, in a designed order.`;
  const user = `Vibe brief from the user: "${brief || "just mix it — use a sensible warmup/build/peak/cooldown arc"}"

${lengthNote}
${mcMode ? "MC mode is ON — include a short one-line radio-DJ intro (mc_line) for every track." : ""}

Track pool (tab-separated, one per line):
${serializeTracks(tracks)}`;

  const plan = await callJson<SetPlan>(PLAN_SYSTEM_PROMPT, user, planSchema(mcMode));
  return validateAndClean(plan, tracks);
}

const STEER_SYSTEM_PROMPT = `You are Set Architect's live steering brain. The DJ set is already playing. You receive: the full track pool, the remaining (not-yet-played) setlist, the played history, any locked/banned tracks, and a message from the human DJ. Classify the message and respond via the JSON schema:

- "action": the message is a literal, specific command — e.g. "play X next", "queue the Daft Punk one after this", "save X for the finale", "don't play Y tonight", or a skip. Resolve the referenced track by fuzzy-matching against the track pool (titles, artists, loose descriptions like "the Queen song" or "that one from the Barbie soundtrack"). Obey commands literally — no creative reinterpretation. action_type is one of: play_next, insert_after_current, pin_to_position, ban_track. confirmation is a short one-line human-readable summary of what you did (e.g. "Pinned 'One More Time' -> up next").
- "replan": the message is a vibe/direction steer — e.g. "take it darker", "more 90s hip-hop", "energy up now", or a skip used as feedback. Re-plan the REMAINING part of the set (tracks already played stay played and must not reappear) using the same pool, pulling in benched tracks or benching queued ones as needed. Keep the same JSON shape as a full plan for the "replan" field (setlist = the new remaining order from now on, benched = pool tracks not in that order, summary = what changed and why). Entries in the given remaining setlist marked locked=true were pinned there by a direct human command — keep them at the exact same position in your new order; only reflow the unlocked tracks around them.
- "ambiguous": the human referred to a track and 2-3 pool tracks are plausible matches — return them as ambiguous_candidates so the app can ask for confirmation. Do not guess.
- "not_found": the human asked for a specific song/artist that is not in the pool at all — say so plainly in "message".

Never reintroduce an already-played track unless the human explicitly asks for it. Never invent a spotify_uri that isn't in the pool. Only fill the ONE field matching your chosen "kind"; the rest must be null.`;

const steerResponseSchema = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["action", "replan", "ambiguous", "not_found"] },
      action: {
        type: ["object", "null"],
        properties: {
          action_type: {
            type: "string",
            enum: ["play_next", "insert_after_current", "pin_to_position", "ban_track"],
          },
          spotify_uri: { type: "string" },
          position: { type: ["integer", "null"] },
          confirmation: { type: "string" },
        },
        required: ["action_type", "spotify_uri", "position", "confirmation"],
        additionalProperties: false,
      },
      replan: {
        type: ["object", "null"],
        properties: {
          setlist: { type: "array", items: setlistEntrySchema(false) },
          benched: {
            type: "array",
            items: {
              type: "object",
              properties: {
                spotify_uri: { type: "string" },
                title: { type: "string" },
                artist: { type: "string" },
                reason: { type: "string" },
              },
              required: ["spotify_uri", "title", "artist", "reason"],
              additionalProperties: false,
            },
          },
          summary: { type: "string" },
        },
        required: ["setlist", "benched", "summary"],
        additionalProperties: false,
      },
      ambiguous_candidates: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            spotify_uri: { type: "string" },
            title: { type: "string" },
            artist: { type: "string" },
          },
          required: ["spotify_uri", "title", "artist"],
          additionalProperties: false,
        },
      },
      pending_action_type: {
        type: ["string", "null"],
        enum: ["play_next", "insert_after_current", "pin_to_position", "ban_track", null],
        description: "When kind is 'ambiguous', the action the human wants performed once a candidate is chosen.",
      },
      message: { type: ["string", "null"] },
    },
    required: ["kind", "action", "replan", "ambiguous_candidates", "pending_action_type", "message"],
    additionalProperties: false,
  },
} as const;

export async function generateSteerResponse(opts: {
  instruction: string;
  pool: Track[];
  remainingSetlist: SetlistEntry[];
  playedHistory: SetlistEntry[];
  bannedUris: string[];
}): Promise<SteerAction> {
  const { instruction, pool, remainingSetlist, playedHistory, bannedUris } = opts;
  const user = `Human DJ instruction: "${instruction}"

Track pool (tab-separated):
${serializeTracks(pool)}

Remaining setlist (not yet played, in order):
${remainingSetlist.map((e) => `${e.spotify_uri}\t${e.title}\t${e.artist}\t${e.phase}\tlocked=${!!e.locked}`).join("\n") || "(empty)"}

Played history (do not reintroduce unless explicitly asked):
${playedHistory.map((e) => `${e.spotify_uri}\t${e.title}\t${e.artist}`).join("\n") || "(none yet)"}

Banned tracks (never play):
${bannedUris.join(", ") || "(none)"}`;

  const raw = await callJson<any>(STEER_SYSTEM_PROMPT, user, steerResponseSchema);

  if (raw.kind === "action" && raw.action) {
    const uri = raw.action.spotify_uri;
    if (!pool.some((t) => t.uri === uri)) {
      return { type: "not_found", message: `I couldn't find that track in this playlist.` };
    }
    return {
      type: "action",
      action: raw.action.action_type,
      spotify_uri: uri,
      position: raw.action.position ?? undefined,
      confirmation: raw.action.confirmation,
    };
  }
  if (raw.kind === "replan" && raw.replan) {
    const cleaned = validateAndClean(raw.replan, pool);
    return { type: "replan", plan: cleaned };
  }
  if (raw.kind === "ambiguous" && raw.ambiguous_candidates) {
    const candidates = raw.ambiguous_candidates.filter((c: any) => pool.some((t) => t.uri === c.spotify_uri));
    return {
      type: "ambiguous",
      candidates,
      pendingActionType: raw.pending_action_type ?? "play_next",
      message: raw.message ?? "Which one did you mean?",
    };
  }
  return { type: "not_found", message: raw.message ?? "I couldn't figure out what you meant." };
}
