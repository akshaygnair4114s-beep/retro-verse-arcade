import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePersistentState } from "@/hooks/usePersistentScore";

/* ──────────────────────────────────────────────────────────────────────────
   Tic-Tac-Toe — vs CPU (existing), Local 2-Player (hot-seat),
   and Online 2-Player via existing Rooms + Supabase Realtime.
   ────────────────────────────────────────────────────────────────────────── */

type Mark = "X" | "O";
type Cell = Mark | null;
type Board = Cell[];

const LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWin(b: Board): { winner: Mark | null; line: [number, number, number] | null } {
  for (const ln of LINES) {
    const [a, c, d] = ln;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a] as Mark, line: ln };
  }
  return { winner: null, line: null };
}

function aiMove(b: Board, ai: Mark): number {
  const human: Mark = ai === "X" ? "O" : "X";
  for (let i = 0; i < 9; i++)
    if (!b[i]) {
      const t = [...b];
      t[i] = ai;
      if (checkWin(t).winner === ai) return i;
    }
  for (let i = 0; i < 9; i++)
    if (!b[i]) {
      const t = [...b];
      t[i] = human;
      if (checkWin(t).winner === human) return i;
    }
  for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (!b[i]) return i;
  return 0;
}

const X_COLOR = "#00F5FF";
const O_COLOR = "#FF00AA";

/* ── Stats (online only) ───────────────────────────────────────────────── */
async function recordMatchResult(
  userId: string,
  roomId: string | null,
  opponentId: string | null,
  result: "win" | "loss" | "draw",
  durationSec: number,
) {
  try {
    await supabase.from("match_history").insert({
      player_id: userId,
      opponent_id: opponentId,
      room_id: roomId,
      game_type: "tictactoe",
      result,
      score: result === "win" ? 1 : 0,
      duration_seconds: Math.max(0, Math.floor(durationSec)),
    });
    const { data: prev } = await supabase
      .from("player_stats")
      .select("games_played, games_won, games_lost")
      .eq("user_id", userId)
      .maybeSingle();
    const games_played = (prev?.games_played ?? 0) + 1;
    const games_won = (prev?.games_won ?? 0) + (result === "win" ? 1 : 0);
    const games_lost = (prev?.games_lost ?? 0) + (result === "loss" ? 1 : 0);
    await supabase
      .from("player_stats")
      .upsert({ user_id: userId, games_played, games_won, games_lost }, { onConflict: "user_id" });
  } catch {
    /* best effort */
  }
}

/* ── Top-level component ───────────────────────────────────────────────── */
export default function TicTacToe() {
  const search = useSearch({ strict: false }) as { room?: string };
  const roomCode = typeof search?.room === "string" ? search.room.toUpperCase() : null;
  const [mode, setMode] = useState<"menu" | "cpu" | "local" | "online">(
    roomCode ? "online" : "menu",
  );

  if (mode === "menu") return <ModeMenu onPick={setMode} />;
  if (mode === "cpu") return <CpuGame onExit={() => setMode("menu")} />;
  if (mode === "local") return <LocalGame onExit={() => setMode("menu")} />;
  return <OnlineGame roomCode={roomCode!} onExit={() => setMode("menu")} />;
}

function ModeMenu({ onPick }: { onPick: (m: "cpu" | "local" | "online") => void }) {
  return (
    <div className="grid place-items-center p-6 min-h-[420px]">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
          Choose Mode
        </div>
        <h2 className="mt-2 font-display text-3xl font-black neon-text-cyan">TIC-TAC-TOE</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Three in a row. Outwit the bot, your friend, or the world.
        </p>
        <div className="mt-6 grid gap-3">
          <button className="btn-neon" onClick={() => onPick("cpu")}>
            Single Player (vs CPU)
          </button>
          <button className="btn-ghost-neon" onClick={() => onPick("local")}>
            Local 2-Player (same device)
          </button>
          <Link to="/rooms" className="btn-ghost-neon">
            Online: open a Room →
          </Link>
        </div>
        <p className="mt-4 text-[11px] font-mono text-muted-foreground">
          For online, create or join a Tic-Tac-Toe room from{" "}
          <span className="text-neon-cyan">Rooms</span> and press{" "}
          <span className="text-neon-magenta">Enter Match</span>.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CPU GAME (preserves the original behavior, including persisted score)
   ────────────────────────────────────────────────────────────────────────── */
function CpuGame({ onExit }: { onExit: () => void }) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<Mark>("X");
  const [stats, setStats] = usePersistentState("tictactoe", { w: 0, l: 0, d: 0 });

  const { winner, line } = checkWin(board);
  const full = board.every(Boolean);
  const done = !!winner || full;

  const resolve = (b: Board) => {
    const w = checkWin(b).winner;
    setStats((s) => ({
      w: s.w + (w === "X" ? 1 : 0),
      l: s.l + (w === "O" ? 1 : 0),
      d: s.d + (!w && b.every(Boolean) ? 1 : 0),
    }));
  };

  const onCell = (i: number) => {
    if (board[i] || done || turn !== "X") return;
    const nb = [...board];
    nb[i] = "X";
    setBoard(nb);
    const w = checkWin(nb);
    if (w.winner || nb.every(Boolean)) {
      resolve(nb);
      return;
    }
    setTurn("O");
    setTimeout(() => {
      const move = aiMove(nb, "O");
      const ab = [...nb];
      ab[move] = "O";
      setBoard(ab);
      if (checkWin(ab).winner || ab.every(Boolean)) resolve(ab);
      else setTurn("X");
    }, 300);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto w-full max-w-md md:max-w-none">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Mode · vs CPU
          </div>
          <button onClick={onExit} className="btn-ghost-neon !py-1.5 !px-2 !text-[11px]">
            Back
          </button>
        </div>
        <BoardView
          board={board}
          line={line}
          disabled={done || turn !== "X"}
          onCell={onCell}
          youAre={null}
        />
        <div className="mt-4 text-center font-display uppercase tracking-widest">
          {winner === "X" && <span className="neon-text-cyan">You win!</span>}
          {winner === "O" && <span className="neon-text-magenta">CPU wins</span>}
          {!winner && full && <span className="text-neon-yellow">Draw</span>}
          {!done && (
            <span className="text-muted-foreground text-sm">
              {turn === "X" ? "Your move" : "CPU thinking…"}
            </span>
          )}
        </div>
      </div>
      <aside className="grid gap-3 grid-cols-3 md:grid-cols-1 md:w-56">
        <Stat label="Wins" value={stats.w} cls="neon-text-cyan" />
        <Stat label="Losses" value={stats.l} cls="neon-text-magenta" />
        <Stat label="Draws" value={stats.d} cls="text-neon-yellow" />
        <button onClick={reset} className="btn-ghost-neon !text-xs col-span-3 md:col-span-1">
          New Game
        </button>
        <button
          onClick={() => setStats({ w: 0, l: 0, d: 0 })}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline col-span-3 md:col-span-1"
        >
          Reset record
        </button>
      </aside>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   LOCAL 2-PLAYER (hot-seat)
   ────────────────────────────────────────────────────────────────────────── */
function LocalGame({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState<{ p0: string; p1: string }>({ p0: "", p1: "" });
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="grid place-items-center p-6 min-h-[420px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (names.p0.trim().length >= 2 && names.p1.trim().length >= 2) setStarted(true);
          }}
          className="w-full max-w-md space-y-4 text-center"
        >
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
            Local 2-Player
          </div>
          <h3 className="font-display text-2xl font-black neon-text-cyan">Enter Player Names</h3>
          {[0, 1].map((i) => (
            <div key={i} className="text-left">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                <span style={{ color: i === 0 ? X_COLOR : O_COLOR }}>● </span>
                Player {i + 1} ({i === 0 ? "X" : "O"})
              </label>
              <input
                value={i === 0 ? names.p0 : names.p1}
                onChange={(e) =>
                  setNames((n) =>
                    i === 0
                      ? { ...n, p0: e.target.value.slice(0, 20) }
                      : { ...n, p1: e.target.value.slice(0, 20) },
                  )
                }
                maxLength={20}
                placeholder={`PLAYER ${i + 1}`}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 font-mono uppercase tracking-widest focus:outline-none focus:border-neon-cyan"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-center pt-2">
            <button type="button" onClick={onExit} className="btn-ghost-neon">
              Back
            </button>
            <button
              type="submit"
              className="btn-neon disabled:opacity-40"
              disabled={names.p0.trim().length < 2 || names.p1.trim().length < 2}
            >
              Start Match →
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <TicTacMatch
      players={[names.p0.trim(), names.p1.trim()]}
      youAre={null}
      mode="local"
      onMove={null}
      onExit={onExit}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ONLINE GAME (Realtime via Supabase channels) — mirrors chain-reaction
   ────────────────────────────────────────────────────────────────────────── */
type Participant = { user_id: string; username: string };
type RemoteMove = { i: number; by: 0 | 1; turn: number; epoch: number };
type RemoteRematch = { epoch: number };

function OnlineGame({ roomCode, onExit }: { roomCode: string; onExit: () => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "lobby" | "playing" | "ended" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const moveHandlerRef = useRef<((m: RemoteMove) => void) | null>(null);
  const rematchHandlerRef = useRef<((r: RemoteRematch) => void) | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [startSignal, setStartSignal] = useState(0);
  const [rematchEpoch, setRematchEpoch] = useState(0);

  // Load room + participants
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: room, error } = await supabase
        .from("game_rooms")
        .select("id, host_id, game_type, status, max_players")
        .eq("code", roomCode)
        .maybeSingle();
      if (!active) return;
      if (error || !room) {
        setErrorMsg("Room not found.");
        setStatus("error");
        return;
      }
      if (room.game_type !== "tictactoe" && room.game_type !== "tic-tac-toe") {
        setErrorMsg("This room is for a different game.");
        setStatus("error");
        return;
      }
      setRoomId(room.id);
      setHostId(room.host_id);

      const { data: parts } = await supabase
        .from("room_participants")
        .select("user_id, profile:profiles!room_participants_user_id_profiles_fkey(username)")
        .eq("room_id", room.id);
      const list: Participant[] = (parts || []).map(
        (p: {
          user_id: string;
          profile: { username: string } | { username: string }[] | null;
        }) => ({
          user_id: p.user_id,
          username:
            (Array.isArray(p.profile) ? p.profile[0]?.username : p.profile?.username) || "Player",
        }),
      );
      list.sort((a, b) => (a.user_id === room.host_id ? -1 : b.user_id === room.host_id ? 1 : 0));
      setParticipants(list);

      if (!list.find((p) => p.user_id === user.id) && list.length < (room.max_players || 2)) {
        const { error: joinErr } = await supabase.from("room_participants").insert({
          room_id: room.id,
          user_id: user.id,
          is_ready: true,
        });
        if (!joinErr && profile) {
          setParticipants((cur) => [...cur, { user_id: user.id, username: profile.username }]);
        }
      }
      setStatus("lobby");
    })();
    return () => {
      active = false;
    };
  }, [roomCode, user, profile]);

  // Realtime channel
  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase.channel(`tictactoe:${roomCode}`, {
      config: { private: true, presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    const refetchParticipants = async () => {
      const { data } = await supabase
        .from("room_participants")
        .select("user_id, profile:profiles!room_participants_user_id_profiles_fkey(username)")
        .eq("room_id", roomId);
      if (!data) return;
      const list: Participant[] = data.map(
        (p: {
          user_id: string;
          profile: { username: string } | { username: string }[] | null;
        }) => ({
          user_id: p.user_id,
          username:
            (Array.isArray(p.profile) ? p.profile[0]?.username : p.profile?.username) || "Player",
        }),
      );
      list.sort((a, b) => (a.user_id === hostId ? -1 : b.user_id === hostId ? 1 : 0));
      setParticipants(list);
    };

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOpponentConnected(Object.keys(state).length >= 2);
      refetchParticipants();
    });
    ch.on("broadcast", { event: "start" }, () => setStartSignal((s) => s + 1));
    ch.on("broadcast", { event: "leave" }, () => {
      setErrorMsg("Opponent left the match.");
      setStatus("ended");
    });
    ch.on("broadcast", { event: "move" }, (payload: { payload: RemoteMove }) => {
      moveHandlerRef.current?.(payload.payload);
    });
    ch.on("broadcast", { event: "rematch" }, (payload: { payload: RemoteRematch }) => {
      setRematchEpoch(payload.payload.epoch);
      rematchHandlerRef.current?.(payload.payload);
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, at: Date.now() });
      }
    });
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [roomId, user, roomCode, hostId]);

  if (status === "loading") return <CenterStatus text="Connecting to room…" />;
  if (status === "error")
    return (
      <CenterStatus
        text={errorMsg}
        action={
          <button className="btn-neon mt-4" onClick={onExit}>
            ← Back
          </button>
        }
      />
    );
  if (status === "ended")
    return (
      <CenterStatus
        text={errorMsg || "Match ended."}
        action={
          <div className="flex gap-2 justify-center mt-4">
            <button className="btn-ghost-neon" onClick={onExit}>
              Back
            </button>
            <button className="btn-neon" onClick={() => navigate({ to: "/rooms" })}>
              Rooms
            </button>
          </div>
        }
      />
    );

  const slot: 0 | 1 | null = !user
    ? null
    : participants[0]?.user_id === user.id
      ? 0
      : participants[1]?.user_id === user.id
        ? 1
        : null;
  const isHost = hostId === user?.id;
  const ready = participants.length >= 2 && opponentConnected;

  if (status === "lobby" && !startSignal) {
    return (
      <div className="grid place-items-center p-6 min-h-[420px]">
        <div className="w-full max-w-md text-center">
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
            Online Match
          </div>
          <h3 className="mt-1 font-display text-2xl font-black neon-text-cyan">Room {roomCode}</h3>
          <div className="mt-4 space-y-2 text-left">
            {[0, 1].map((i) => {
              const p = participants[i];
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-black/40 border border-white/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: i === 0 ? X_COLOR : O_COLOR }}>
                      ● {i === 0 ? "X" : "O"}
                    </span>
                    <span className="font-mono text-sm">{p?.username || "Waiting…"}</span>
                    {p?.user_id === user?.id && (
                      <span className="text-[10px] font-mono text-neon-yellow uppercase">you</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    {p ? (i === 0 ? "Host" : "Challenger") : "Empty"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground font-mono">
            {ready ? "Both players connected." : "Waiting for opponent to connect…"}
          </p>
          <div className="mt-5 flex gap-2 justify-center">
            <button className="btn-ghost-neon" onClick={onExit}>
              Leave
            </button>
            {isHost ? (
              <button
                className="btn-neon disabled:opacity-40"
                disabled={!ready}
                onClick={() => {
                  channelRef.current?.send({ type: "broadcast", event: "start", payload: {} });
                  setStartSignal((s) => s + 1);
                }}
              >
                Start Match →
              </button>
            ) : (
              <span className="text-xs font-mono text-muted-foreground self-center">
                Host will start the match
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (slot === null) {
    return (
      <CenterStatus
        text="Room is full. Spectating is not supported yet."
        action={
          <button className="btn-neon mt-4" onClick={onExit}>
            ← Back
          </button>
        }
      />
    );
  }

  return (
    <TicTacMatch
      key={`${startSignal}:${rematchEpoch}`}
      players={[participants[0]?.username || "Player 1", participants[1]?.username || "Player 2"]}
      youAre={slot}
      mode="online"
      onMove={(m) => channelRef.current?.send({ type: "broadcast", event: "move", payload: m })}
      onSubscribeMoves={(handler) => {
        moveHandlerRef.current = handler;
        return () => {
          moveHandlerRef.current = null;
        };
      }}
      onRequestRematch={() => {
        const epoch = Date.now();
        channelRef.current?.send({ type: "broadcast", event: "rematch", payload: { epoch } });
        setRematchEpoch(epoch);
      }}
      onSubscribeRematch={(handler) => {
        rematchHandlerRef.current = handler;
        return () => {
          rematchHandlerRef.current = null;
        };
      }}
      opponentIds={participants.filter((p) => p.user_id !== user?.id).map((p) => p.user_id)}
      roomId={roomId}
      opponentConnected={opponentConnected}
      onExit={() => {
        channelRef.current?.send({ type: "broadcast", event: "leave", payload: {} });
        onExit();
      }}
    />
  );
}

function CenterStatus({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center p-6 min-h-[420px] text-center">
      <div>
        <div className="text-neon-cyan font-mono animate-pulse">{text}</div>
        {action}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MATCH (shared by local 2P + online)
   ────────────────────────────────────────────────────────────────────────── */
type MatchProps = {
  players: [string, string];
  youAre: 0 | 1 | null; // null = local hot-seat
  mode: "local" | "online";
  onMove: ((m: RemoteMove) => void) | null;
  onSubscribeMoves?: (handler: (m: RemoteMove) => void) => () => void;
  onRequestRematch?: () => void;
  onSubscribeRematch?: (handler: (r: RemoteRematch) => void) => () => void;
  opponentIds?: string[];
  roomId?: string | null;
  opponentConnected?: boolean;
  onExit: () => void;
};

function TicTacMatch({
  players,
  youAre,
  mode,
  onMove,
  onSubscribeMoves,
  onRequestRematch,
  onSubscribeRematch,
  opponentIds,
  roomId,
  opponentConnected,
  onExit,
}: MatchProps) {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null));
  const [turn, setTurn] = useState(0); // even => slot 0 (X)
  const [history, setHistory] = useState<RemoteMove[]>([]);
  const [epoch, setEpoch] = useState(0);
  const recordedRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  const current: 0 | 1 = turn % 2 === 0 ? 0 : 1;
  const { winner: winMark, line } = checkWin(board);
  const full = board.every(Boolean);
  const done = !!winMark || full;
  const winnerSlot: 0 | 1 | -1 = winMark === "X" ? 0 : winMark === "O" ? 1 : -1;

  // Apply a move (used by both local clicks and remote events)
  const doApply = useCallback(
    (m: RemoteMove, broadcast: boolean) => {
      setBoard((prev) => {
        if (m.turn !== history.length) return prev; // out-of-order guard
        if (prev[m.i]) return prev; // cell already taken
        const expectedBy: 0 | 1 = history.length % 2 === 0 ? 0 : 1;
        if (m.by !== expectedBy) return prev;
        if (m.epoch !== epoch) return prev; // stale (pre-rematch)
        const next = [...prev];
        next[m.i] = m.by === 0 ? "X" : "O";
        setHistory((h) => [...h, m]);
        setTurn((t) => t + 1);
        return next;
      });
      if (broadcast && onMove) onMove(m);
    },
    [history.length, onMove, epoch],
  );

  // Subscribe to opponent moves
  useEffect(() => {
    if (mode !== "online" || !onSubscribeMoves) return;
    const unsub = onSubscribeMoves((m) => {
      if (m.by === youAre) return;
      doApply(m, false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch]);

  // Subscribe to rematch signal from opponent
  useEffect(() => {
    if (mode !== "online" || !onSubscribeRematch) return;
    const unsub = onSubscribeRematch((r) => {
      // reset to new epoch
      setBoard(Array(9).fill(null));
      setTurn(0);
      setHistory([]);
      setEpoch(r.epoch);
      recordedRef.current = false;
      startedAtRef.current = Date.now();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Record stats once on game end (online only)
  useEffect(() => {
    if (!done || recordedRef.current) return;
    if (mode !== "online" || !user || youAre === null) return;
    recordedRef.current = true;
    const result: "win" | "loss" | "draw" =
      winnerSlot === -1 ? "draw" : winnerSlot === youAre ? "win" : "loss";
    const duration = (Date.now() - startedAtRef.current) / 1000;
    recordMatchResult(user.id, roomId || null, opponentIds?.[0] || null, result, duration);
  }, [done, winnerSlot, mode, user, youAre, roomId, opponentIds]);

  const handleCell = (i: number) => {
    if (done) return;
    if (board[i]) return;
    if (mode === "online" && youAre !== current) return; // not your turn
    const m: RemoteMove = { i, by: current, turn: history.length, epoch };
    doApply(m, true);
  };

  const localRematch = () => {
    setBoard(Array(9).fill(null));
    setTurn(0);
    setHistory([]);
    setEpoch((e) => e + 1);
    recordedRef.current = false;
    startedAtRef.current = Date.now();
  };

  const onlineRematch = () => {
    if (!onRequestRematch) return;
    const newEpoch = Date.now();
    setBoard(Array(9).fill(null));
    setTurn(0);
    setHistory([]);
    setEpoch(newEpoch);
    recordedRef.current = false;
    startedAtRef.current = Date.now();
    onRequestRematch();
  };

  const turnLabel = done
    ? winnerSlot === -1
      ? "Draw"
      : `${players[winnerSlot]} wins!`
    : `${players[current]}'s turn`;
  const turnColor = done
    ? winnerSlot === -1
      ? "#FFD700"
      : winnerSlot === 0
        ? X_COLOR
        : O_COLOR
    : current === 0
      ? X_COLOR
      : O_COLOR;

  const disabledBoard = done || (mode === "online" && youAre !== current);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                current === i && !done
                  ? "border-white/20 bg-black/50"
                  : "border-white/10 bg-black/30"
              }`}
              style={
                current === i && !done
                  ? { boxShadow: `0 0 12px ${i === 0 ? X_COLOR : O_COLOR}55` }
                  : {}
              }
            >
              <span
                className="font-display font-black text-lg"
                style={{
                  color: i === 0 ? X_COLOR : O_COLOR,
                  textShadow: `0 0 6px ${i === 0 ? X_COLOR : O_COLOR}`,
                }}
              >
                {i === 0 ? "X" : "O"}
              </span>
              <span className="font-mono text-sm text-foreground/90 max-w-[10rem] truncate">
                {players[i]}
              </span>
              {mode === "online" && youAre === i && (
                <span className="text-[10px] font-mono text-neon-yellow uppercase">you</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {mode === "online" && (
            <span
              className={`text-[10px] font-mono uppercase tracking-widest ${opponentConnected ? "text-neon-green" : "text-neon-magenta animate-pulse"}`}
            >
              {opponentConnected ? "● Live" : "● Reconnecting…"}
            </span>
          )}
          {mode === "local" && (
            <button onClick={localRematch} className="btn-ghost-neon !py-1.5 !px-2 !text-[11px]">
              Restart
            </button>
          )}
          <button
            onClick={onExit}
            className="btn-ghost-neon !py-1.5 !px-2 !text-[11px] !text-neon-magenta"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="text-center mb-3">
        <div
          className="font-display font-bold text-base sm:text-lg"
          style={{ color: turnColor, textShadow: `0 0 8px ${turnColor}` }}
        >
          {turnLabel}
        </div>
        {mode === "online" && !done && youAre !== current && (
          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
            Waiting for opponent…
          </div>
        )}
      </div>

      {/* Board */}
      <BoardView
        board={board}
        line={line}
        disabled={disabledBoard}
        onCell={handleCell}
        youAre={youAre}
        current={current}
        mode={mode}
      />

      {/* Footer actions */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {done &&
          (mode === "local" ? (
            <button onClick={localRematch} className="btn-neon">
              Rematch
            </button>
          ) : (
            <>
              <button onClick={onlineRematch} className="btn-neon" disabled={!opponentConnected}>
                {opponentConnected ? "Rematch" : "Waiting…"}
              </button>
              <button onClick={onExit} className="btn-ghost-neon">
                Leave Match
              </button>
            </>
          ))}
      </div>

      {/* Victory overlay */}
      {done && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="glass rounded-2xl p-6 max-w-sm w-full text-center ring-2"
            style={{
              boxShadow: `0 0 32px ${winnerSlot === -1 ? "#FFD70088" : winnerSlot === 0 ? `${X_COLOR}88` : `${O_COLOR}88`}`,
            }}
          >
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
              Match Over
            </div>
            <h3
              className="mt-2 font-display text-3xl font-black"
              style={{
                color: winnerSlot === -1 ? "#FFD700" : winnerSlot === 0 ? X_COLOR : O_COLOR,
                textShadow: `0 0 12px ${winnerSlot === -1 ? "#FFD700" : winnerSlot === 0 ? X_COLOR : O_COLOR}`,
              }}
            >
              {winnerSlot === -1 ? "Draw" : `${players[winnerSlot]} wins!`}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">Moves: {history.length}</p>
            <div className="mt-5 flex gap-2 justify-center">
              {mode === "local" ? (
                <>
                  <button className="btn-neon" onClick={localRematch}>
                    Rematch
                  </button>
                  <button className="btn-ghost-neon" onClick={onExit}>
                    Exit
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-neon disabled:opacity-40"
                    onClick={onlineRematch}
                    disabled={!opponentConnected}
                  >
                    {opponentConnected ? "Rematch" : "Opponent offline"}
                  </button>
                  <button className="btn-ghost-neon" onClick={onExit}>
                    Leave Match
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Board renderer ────────────────────────────────────────────────────── */
function BoardView({
  board,
  line,
  disabled,
  onCell,
  youAre,
  current,
  mode,
}: {
  board: Board;
  line: [number, number, number] | null;
  disabled: boolean;
  onCell: (i: number) => void;
  youAre: 0 | 1 | null;
  current?: 0 | 1;
  mode?: "local" | "online" | "cpu";
}) {
  return (
    <div
      className="grid gap-2 grid-cols-3 p-3 mx-auto w-fit bg-black/60 rounded-xl ring-1 ring-neon-purple/30"
      style={{ boxShadow: "0 0 30px oklch(0.65 0.24 300 / 0.25)" }}
    >
      {board.map((c, i) => {
        const inWin = line?.includes(i);
        const cellDisabled = disabled || !!c;
        return (
          <button
            key={i}
            onClick={() => onCell(i)}
            disabled={cellDisabled}
            aria-label={`cell ${i + 1}${c ? `, ${c}` : ", empty"}`}
            className="grid place-items-center rounded-lg transition-all font-display font-black text-4xl sm:text-5xl"
            style={{
              width: "clamp(64px, 22vw, 110px)",
              height: "clamp(64px, 22vw, 110px)",
              background: inWin ? "oklch(0.65 0.24 300 / 0.3)" : "rgba(255,255,255,0.05)",
              color: c === "X" ? X_COLOR : c === "O" ? O_COLOR : "transparent",
              textShadow: c ? `0 0 12px currentColor` : "none",
              cursor: cellDisabled ? "default" : "pointer",
              opacity: mode === "online" && youAre !== current && !c ? 0.85 : 1,
            }}
          >
            {c ?? "·"}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="glass rounded-lg p-3 ring-1 ring-white/10">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
