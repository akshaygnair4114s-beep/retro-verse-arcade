import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase, type MatchHistory } from "@/lib/supabase";
import { useEffect, useState as useReactState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RetroVerse Arcade" },
      { name: "description", content: "View your RetroVerse Arcade profile, stats, achievements, and match history." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://retroverse.arcade/profile" },
    ],
  }),
  component: ProfilePage,
});

const AVATAR_OPTIONS = [
  "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&w=100&h=100&fit=crop",
  "https://images.pexels.com/photos/1226482/pexels-photo-1226482.jpeg?auto=compress&w=100&h=100&fit=crop",
  "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&w=100&h=100&fit=crop",
  "https://images.pexels.com/photos/1109354/pexels-photo-1109354.jpeg?auto=compress&w=100&h=100&fit=crop",
  "https://images.pexels.com/photos/2081485/pexels-photo-2081485.jpeg?auto=compress&w=100&h=100&fit=crop",
  "https://images.pexels.com/photos/1697254/pexels-photo-1697254.jpeg?auto=compress&w=100&h=100&fit=crop",
];

const GAME_NAMES: Record<string, string> = {
  tetris: "Tetris",
  snake: "Snake",
  pong: "Pong",
  g2048: "2048",
  sudoku: "Sudoku",
  memory: "Memory",
  tictactoe: "Tic-Tac-Toe",
  snakes_and_ladders: "Snakes & Ladders",
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, stats, loading, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [matchHistory, setMatchHistory] = useReactState<MatchHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useReactState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setSelectedAvatar(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      setHistoryLoading(true);
      const { data } = await supabase
        .from("match_history")
        .select("*")
        .eq("player_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setMatchHistory((data as MatchHistory[]) || []);
      setHistoryLoading(false);
    }
    fetchHistory();
  }, [user]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const updates: { username?: string; avatar_url?: string | null } = {};
    if (username !== profile?.username) {
      const clean = username.replace(/[^a-zA-Z0-9_-]/g, "").trim().slice(0, 20);
      if (clean.length < 3) {
        setError("Username must be at least 3 characters");
        setSaving(false);
        return;
      }
      updates.username = clean;
    }
    if (selectedAvatar !== profile?.avatar_url) {
      updates.avatar_url = selectedAvatar;
    }

    if (Object.keys(updates).length > 0) {
      const result = await updateProfile(updates);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setEditing(false);
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center">
          <div className="text-neon-cyan font-mono animate-pulse">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user || !profile) return null;

  const winRate = stats?.games_played ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Profile Header */}
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-neon-cyan/50 shadow-lg">
                  {selectedAvatar ? (
                    <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center text-3xl font-display font-black text-background">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {editing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-neon-cyan text-background grid place-items-center text-sm font-bold shadow-md"
                  >
                    ✎
                  </button>
                )}
              </div>

              {showAvatarPicker && editing && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass rounded-lg p-3 z-10">
                  <div className="grid grid-cols-3 gap-2">
                    {AVATAR_OPTIONS.map((url) => (
                      <button
                        key={url}
                        onClick={() => {
                          setSelectedAvatar(url);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-14 h-14 rounded-full overflow-hidden ring-2 transition-all ${
                          selectedAvatar === url ? "ring-neon-cyan" : "ring-white/20"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedAvatar(null);
                        setShowAvatarPicker(false);
                      }}
                      className={`w-14 h-14 rounded-full overflow-hidden ring-2 bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center text-xs font-display font-black text-background ${
                        !selectedAvatar ? "ring-neon-cyan" : "ring-white/20"
                      }`}
                    >
                      {profile.username.charAt(0).toUpperCase()}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                {editing ? (
                  <div className="max-w-xs mx-auto sm:mx-0">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/15 text-foreground text-lg font-display font-bold focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                ) : (
                  <h1 className="font-display text-2xl md:text-3xl font-black neon-text-cyan">
                    {profile.username}
                  </h1>
                )}
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  Member since {memberSince}
                </p>
              </div>

              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-neon text-sm disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setShowAvatarPicker(false);
                        setUsername(profile.username);
                        setSelectedAvatar(profile.avatar_url);
                        setError(null);
                      }}
                      className="btn-ghost-neon text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn-ghost-neon text-sm">
                      Edit Profile
                    </button>
                    <button onClick={handleSignOut} className="btn-ghost-neon text-sm !text-neon-magenta">
                      Log Out
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta text-sm font-mono text-center">
                {error}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Games Played" value={stats?.games_played ?? 0} color="cyan" />
            <StatCard label="Wins" value={stats?.games_won ?? 0} color="green" />
            <StatCard label="Losses" value={stats?.games_lost ?? 0} color="magenta" />
            <StatCard label="Win Rate" value={`${winRate}%`} color="yellow" />
          </div>

          {/* Achievements */}
          {stats?.achievements && stats.achievements.length > 0 && (
            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Achievements</h2>
              <div className="flex flex-wrap gap-3">
                {stats.achievements.map((achievement) => (
                  <div
                    key={achievement}
                    className="px-3 py-2 rounded-lg bg-neon-yellow/20 border border-neon-yellow/30 text-neon-yellow text-sm font-mono"
                  >
                    {achievement}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Scores */}
          {stats?.high_scores && Object.keys(stats.high_scores).length > 0 && (
            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">High Scores</h2>
              <div className="grid gap-3">
                {Object.entries(stats.high_scores).map(([gameId, score]) => (
                  <div
                    key={gameId}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-black/40 border border-white/10"
                  >
                    <span className="font-mono text-muted-foreground">
                      {GAME_NAMES[gameId] || gameId}
                    </span>
                    <span className="font-display font-bold text-neon-cyan">
                      {score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match History */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Match History</h2>
            {historyLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading...</div>
            ) : matchHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No matches played yet.{" "}
                <Link to="/games" className="text-neon-cyan hover:underline">
                  Start playing!
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {matchHistory.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-black/40 border border-white/10"
                  >
                    <div>
                      <span className="font-mono text-sm text-foreground">
                        {GAME_NAMES[match.game_type] || match.game_type}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(match.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-sm">
                        {match.score.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-mono uppercase px-2 py-1 rounded ${
                          match.result === "win"
                            ? "bg-neon-green/20 text-neon-green"
                            : match.result === "loss"
                            ? "bg-neon-magenta/20 text-neon-magenta"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {match.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rooms Link */}
          <div className="mt-6 text-center">
            <Link to="/rooms" className="btn-neon">
              Join a Game Room
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "cyan" | "green" | "magenta" | "yellow";
}) {
  const colorClass = {
    cyan: "text-neon-cyan",
    green: "text-neon-green",
    magenta: "text-neon-magenta",
    yellow: "text-neon-yellow",
  }[color];

  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className={`font-display text-2xl md:text-3xl font-black ${colorClass}`}>{value}</div>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
