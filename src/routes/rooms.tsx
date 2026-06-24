import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase, type GameRoom, type Profile, type RoomParticipant } from "@/lib/supabase";

export const Route = createFileRoute("/rooms")({
  component: RoomsPage,
});

const GAME_OPTIONS = [
  { id: "chain-reaction", name: "Chain Reaction", players: 2 },
  { id: "tetris", name: "Tetris", players: 2 },
  { id: "snake", name: "Snake", players: 2 },
  { id: "pong", name: "Pong", players: 2 },
  { id: "tictactoe", name: "Tic-Tac-Toe", players: 2 },
  { id: "memory", name: "Memory", players: 4 },
  { id: "sudoku", name: "Sudoku", players: 1 },
  { id: "g2048", name: "2048", players: 1 },
];

type RoomWithDetails = GameRoom & {
  participants: (RoomParticipant & { profile: Profile })[];
  host_profile: Profile;
};

function RoomsPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [selectedGame, setSelectedGame] = useState(GAME_OPTIONS[0].id);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("game_rooms")
      .select(`
        *,
        room_participants (
          *,
          profile:profiles!room_participants_user_id_profiles_fkey (*)
        ),
        host_profile:profiles!game_rooms_host_id_profiles_fkey (*)
      `)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setError("Failed to load rooms");
    } else {
      setRooms(
        (data || []).map((room) => ({
          ...room,
          participants: room.room_participants || [],
        })) as RoomWithDetails[]
      );
    }
    setLoading(false);
  };

  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCreateRoom = async () => {
    if (!user || !profile) return;
    setCreating(true);
    setError(null);

    const game = GAME_OPTIONS.find((g) => g.id === selectedGame);
    const code = generateRoomCode();

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .insert({
        code,
        host_id: user.id,
        game_type: selectedGame,
        max_players: game?.players || 2,
      })
      .select()
      .single();

    if (roomError) {
      setError("Failed to create room: " + roomError.message);
      setCreating(false);
      return;
    }

    const { error: participantError } = await supabase.from("room_participants").insert({
      room_id: room.id,
      user_id: user.id,
      is_ready: true,
    });

    if (participantError) {
      setError("Failed to join created room");
      setCreating(false);
      return;
    }

    setShowCreate(false);
    setCreating(false);
    fetchRooms();
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user || !profile) return;
    setJoining(true);
    setError(null);

    const { error: participantError } = await supabase.from("room_participants").insert({
      room_id: roomId,
      user_id: user.id,
      is_ready: false,
    });

    if (participantError) {
      setError("Failed to join room: " + participantError.message);
      setJoining(false);
      return;
    }

    setJoining(false);
    fetchRooms();
  };

  const handleJoinByCode = async () => {
    if (!joinCode || joinCode.length !== 6) {
      setError("Enter a valid 6-character room code");
      return;
    }

    const { data: room } = await supabase
      .from("game_rooms")
      .select("id, status")
      .eq("code", joinCode.toUpperCase())
      .maybeSingle();

    if (!room) {
      setError("Room not found");
      return;
    }

    if (room.status !== "waiting") {
      setError("Room is no longer accepting players");
      return;
    }

    await handleJoinRoom(room.id);
    setJoinCode("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center">
          <div className="text-neon-cyan font-mono animate-pulse">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Multiplayer</div>
              <h1 className="font-display text-2xl md:text-3xl font-black neon-text-cyan">GAME ROOMS</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create or join a room to play with friends
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)} className="btn-neon text-sm">
                Create Room
              </button>
            </div>
          </div>

          {/* Join by Code */}
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ENTER CODE"
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground font-mono text-center tracking-widest uppercase placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan"
                />
              </div>
              <button
                onClick={handleJoinByCode}
                disabled={joining || joinCode.length !== 6}
                className="btn-ghost-neon disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta text-sm font-mono mb-6">
              {error}
            </div>
          )}

          {/* Create Room Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm">
              <div className="glass rounded-xl p-6 m-4 max-w-md w-full">
                <h2 className="font-display text-xl font-bold neon-text-cyan mb-4">Create Room</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Select Game
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GAME_OPTIONS.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => setSelectedGame(game.id)}
                          className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                            selectedGame === game.id
                              ? "border-neon-cyan bg-neon-cyan/10"
                              : "border-white/15 hover:border-white/30"
                          }`}
                        >
                          <span className="font-display font-bold text-foreground">{game.name}</span>
                          <span className="text-xs text-muted-foreground">{game.players} player(s)</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRoom}
                      disabled={creating}
                      className="btn-neon flex-1 disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create Room"}
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      disabled={creating}
                      className="btn-ghost-neon"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Available Rooms */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground">Available Rooms</h2>
              <button onClick={fetchRooms} className="text-xs font-mono text-neon-cyan hover:underline">
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center text-muted-foreground py-8">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No rooms available. Create one to start playing!
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const game = GAME_OPTIONS.find((g) => g.id === room.game_type);
                  const isFull = room.participants.length >= room.max_players;
                  const isInRoom = room.participants.some((p) => p.user_id === user?.id);
                  const isHost = room.host_id === user?.id;

                  return (
                    <div
                      key={room.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-black/40 border border-white/10"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-foreground">
                            {game?.name || room.game_type}
                          </span>
                          <span className="text-xs font-mono text-neon-yellow rounded px-2 py-0.5 bg-neon-yellow/20">
                            {room.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex -space-x-2">
                            {room.participants.slice(0, 4).map((p) => (
                              <div
                                key={p.id}
                                className="w-6 h-6 rounded-full ring-2 ring-black/40 overflow-hidden"
                              >
                                {p.profile?.avatar_url ? (
                                  <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center text-[8px] font-display font-black text-background">
                                    {p.profile?.username?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {room.participants.length} / {room.max_players}
                          </span>
                          {isHost && (
                            <span className="text-[10px] font-mono uppercase text-neon-magenta px-1.5 py-0.5 rounded bg-neon-magenta/20">
                              Host
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto items-center">
                        {isInRoom ? (
                          <>
                            <span className="text-xs font-mono text-neon-green">In Room</span>
                            <button
                              onClick={() =>
                                navigate({
                                  to: "/games/$gameId",
                                  params: { gameId: room.game_type },
                                  search: { room: room.code } as never,
                                })
                              }
                              className="btn-neon !py-2 !px-3 !text-[11px]"
                            >
                              Enter Match →
                            </button>
                          </>
                        ) : isFull ? (
                          <span className="text-xs font-mono text-muted-foreground">Full</span>
                        ) : (
                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={joining}
                            className="btn-ghost-neon !py-2 !px-3 !text-[11px] flex-1 sm:flex-none"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/games" className="text-neon-cyan hover:underline font-mono text-sm">
              Or play solo games →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
