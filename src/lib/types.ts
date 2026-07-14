export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  scope: string;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
  uri: string;
}

export interface Track {
  uri: string;
  id: string;
  title: string;
  artists: string[];
  album: string;
  releaseYear: number | null;
  durationMs: number;
  addedAt?: string;
}

export type Phase = "warmup" | "build" | "peak" | "cooldown";

export interface SetlistEntry {
  spotify_uri: string;
  title: string;
  artist: string;
  estimated_bpm: number;
  energy_1_to_10: number;
  phase: Phase;
  transition_note: string;
  locked?: boolean;
  mcLine?: string;
  /** Cut Mode only: ms offset to enter/exit the track. Absent when Cut Mode is off. */
  start_ms?: number;
  end_ms?: number;
}

export interface BenchedTrack {
  spotify_uri: string;
  title: string;
  artist: string;
  reason: string;
}

export interface SetPlan {
  setlist: SetlistEntry[];
  benched: BenchedTrack[];
  summary: string;
}

export type SteerAction =
  | { type: "replan"; plan: SetPlan }
  | {
      type: "action";
      action: "play_next" | "insert_after_current" | "pin_to_position" | "ban_track";
      spotify_uri: string;
      position?: number;
      confirmation: string;
    }
  | {
      type: "ambiguous";
      candidates: { spotify_uri: string; title: string; artist: string }[];
      pendingActionType: "play_next" | "insert_after_current" | "pin_to_position" | "ban_track";
      message: string;
    }
  | { type: "not_found"; message: string };
