import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — online features disabled.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerStats = {
  id: string;
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  achievements: string[];
  high_scores: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type GameRoom = {
  id: string;
  code: string;
  host_id: string;
  game_type: string;
  status: "waiting" | "in_progress" | "completed";
  max_players: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RoomParticipant = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_ready: boolean;
  score: number;
};

export type GameInvitation = {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
};

export type MatchHistory = {
  id: string;
  room_id: string | null;
  game_type: string;
  player_id: string;
  opponent_id: string | null;
  result: "win" | "loss" | "draw";
  score: number;
  duration_seconds: number;
  created_at: string;
};
