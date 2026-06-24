import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/* ──────────────────────────────────────────────────────────────────────────
   Chain Reaction — 2 players (local or online via existing Rooms system)
   Board: 6 cols × 9 rows. Critical mass = number of orthogonal neighbours.
   ────────────────────────────────────────────────────────────────────────── */

const COLS = 6;
const ROWS = 9;

type Cell = { owner: -1 | 0 | 1; count: number };
type Board = Cell[][];

type Move = { r: number; c: number; turn: number; by: 0 | 1 };

const PLAYER_COLORS = [
  { hex: "#00F5FF", glow: "0 0 12px rgba(0,245,255,0.85)", name: "Cyan",    text: "text-neon-cyan",    bg: "bg-neon-cyan/20",    ring: "ring-neon-cyan" },
  { hex: "#FF00AA", glow: "0 0 12px rgba(255,0,170,0.85)", name: "Magenta", text: "text-neon-magenta", bg: "bg-neon-magenta/20", ring: "ring-neon-magenta" },
] as const;

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ owner: -1 as const, count: 0 }))
  );
}

function criticalMass(r: number, c: number): number {
  let m = 4;
  if (r === 0 || r === ROWS - 1) m--;
  if (c === 0 || c === COLS - 1) m--;
  return m;
}

function neighbours(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < ROWS - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < COLS - 1) out.push([r, c + 1]);
  return out;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((c) => ({ owner: c.owner, count: c.count })));
}

/** Apply one move (mutates a clone, returns new board). Caller must verify legal. */
function applyMove(board: Board, r: number, c: number, player: 0 | 1): Board {
  const b = cloneBoard(board);
  b[r][c].count += 1;
  b[r][c].owner = player;

  const queue: [number, number][] = [];
  if (b[r][c].count >= criticalMass(r, c)) queue.push([r, c]);

  // Safety guard against pathological infinite cascades
  let steps = 0;
  const maxSteps = COLS * ROWS * 50;

  while (queue.length && steps++ < maxSteps) {
    // Early-stop cascade if one player owns the entire board after first round
    if (gameWinner(b, true) !== -1) break;

    const [cr, cc] = queue.shift()!;
    const mass = criticalMass(cr, cc);
    if (b[cr][cc].count < mass) continue;

    b[cr][cc].count -= mass;
    if (b[cr][cc].count === 0) b[cr][cc].owner = -1;

    for (const [nr, nc] of neighbours(cr, cc)) {
      b[nr][nc].count += 1;
      b[nr][nc].owner = player;
      if (b[nr][nc].count >= criticalMass(nr, nc)) queue.push([nr, nc]);
    }
  }
  return b;
}

/** Returns winning player (0 or 1) or -1 if no winner. `midCascade` skips the "both have played" check. */
function gameWinner(b: Board, midCascade = false): 0 | 1 | -1 {
  let c0 = 0, c1 = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (b[r][c].owner === 0) c0 += b[r][c].count;
    else if (b[r][c].owner === 1) c1 += b[r][c].count;
  }
  if (!midCascade) {
    if (c0 + c1 < 2) return -1; // need at least one move from each
  }
  if (c0 > 0 && c1 === 0) return 0;
  if (c1 > 0 && c0 === 0) return 1;
  return -1;
}

/* ── Sound ─────────────────────────────────────────────────────────────── */
function useSound(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (muted) return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new ((window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
          || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch { return null; }
    }
    return ctxRef.current;
  };
  return useCallback((type: "place" | "explode" | "win" | "lose") => {
    const ctx = ensure();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.1;
    master.connect(ctx.destination);
    const tone = (freq: number, t0: number, dur: number, wave: OscillatorType = "sine") => {
      const o = ctx.createOscillator();
      o.type = wave; o.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.9, ctx.currentTime + t0);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
      o.connect(env); env.connect(master);
      o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.02);
    };
    if (type === "place")  tone(520, 0, 0.08, "triangle");
    if (type === "explode") { tone(180, 0, 0.18, "sawtooth"); tone(360, 0.04, 0.18, "square"); }
    if (type === "win")    [262, 392, 523, 784].forEach((f, i) => tone(f, i * 0.1, 0.22));
    if (type === "lose")   [392, 311, 247, 196].forEach((f, i) => tone(f, i * 0.12, 0.2, "sawtooth"));
    setTimeout(() => { /* keep ctx for reuse */ }, 1000);
  }, [muted]);
}

/* ── Stats helpers (best-effort) ───────────────────────────────────────── */
async function recordMatchResult(userId: string, roomId: string | null, opponentId: string | null, result: "win" | "loss", durationSec: number) {
  try {
    await supabase.from("match_history").insert({
      player_id: userId,
      opponent_id: opponentId,
      room_id: roomId,
      game_type: "chain_reaction",
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
    await supabase.from("player_stats")
      .upsert({ user_id: userId, games_played, games_won, games_lost }, { onConflict: "user_id" });
  } catch { /* best effort */ }
}

/* ── Top-level component ───────────────────────────────────────────────── */
export default function ChainReactionGame() {
  const search = useSearch({ strict: false }) as { room?: string };
  const roomCode = typeof search?.room === "string" ? search.room.toUpperCase() : null;
  const [mode, setMode] = useState<"menu" | "local" | "online">(roomCode ? "online" : "menu");

  if (mode === "menu") return <ModeMenu onPick={setMode} />;
  if (mode === "local") return <LocalGame onExit={() => setMode("menu")} />;
  return <OnlineGame roomCode={roomCode!} onExit={() => setMode("menu")} />;
}

function ModeMenu({ onPick }: { onPick: (m: "local" | "online") => void }) {
  return (
    <div className="aspect-video grid place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Choose Mode</div>
        <h2 className="mt-2 font-display text-3xl font-black neon-text-cyan">CHAIN REACTION</h2>
        <p className="mt-2 text-sm text-muted-foreground">Place orbs. Trigger cascades. Conquer the board.</p>
        <div className="mt-6 grid gap-3">
          <button className="btn-neon" onClick={() => onPick("local")}>
            Local 2-Player (same device)
          </button>
          <Link to="/rooms" className="btn-ghost-neon">
            Online: open a Room →
          </Link>
        </div>
        <p className="mt-4 text-[11px] font-mono text-muted-foreground">
          For online, create or join a Chain Reaction room from <span className="text-neon-cyan">Rooms</span> and press <span className="text-neon-magenta">Enter Match</span>.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   LOCAL GAME
   ────────────────────────────────────────────────────────────────────────── */
function LocalGame({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState<{ p0: string; p1: string }>({ p0: "", p1: "" });
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <div className="aspect-video grid place-items-center p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (names.p0.trim().length >= 2 && names.p1.trim().length >= 2) setStarted(true); }}
          className="w-full max-w-md space-y-4 text-center"
        >
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Local 2-Player</div>
          <h3 className="font-display text-2xl font-black neon-text-cyan">Enter Player Names</h3>
          {[0, 1].map((i) => (
            <div key={i} className="text-left">
              <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                <span style={{ color: PLAYER_COLORS[i].hex }}>● </span>Player {i + 1}
              </label>
              <input
                value={i === 0 ? names.p0 : names.p1}
                onChange={(e) => setNames((n) => i === 0 ? { ...n, p0: e.target.value.slice(0, 20) } : { ...n, p1: e.target.value.slice(0, 20) })}
                maxLength={20}
                placeholder={`PLAYER ${i + 1}`}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 font-mono uppercase tracking-widest focus:outline-none focus:border-neon-cyan"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-center pt-2">
            <button type="button" onClick={onExit} className="btn-ghost-neon">Back</button>
            <button type="submit" className="btn-neon disabled:opacity-40" disabled={names.p0.trim().length < 2 || names.p1.trim().length < 2}>
              Start Match →
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <ChainReactionMatch
      players={[names.p0.trim(), names.p1.trim()]}
      youAre={null}
      onMove={null}
      onExit={onExit}
      mode="local"
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ONLINE GAME (Realtime via Supabase channels)
   ────────────────────────────────────────────────────────────────────────── */
type Participant = { user_id: string; username: string };

function OnlineGame({ roomCode, onExit }: { roomCode: string; onExit: () => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "lobby" | "playing" | "ended" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const moveHandlerRef = useRef<((m: Move) => void) | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [startSignal, setStartSignal] = useState(0);

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
      if (error || !room) { setErrorMsg("Room not found."); setStatus("error"); return; }
      if (room.game_type !== "chain-reaction" && room.game_type !== "chain_reaction") {
        setErrorMsg("This room is for a different game."); setStatus("error"); return;
      }
      setRoomId(room.id);
      setHostId(room.host_id);

      const { data: parts } = await supabase
        .from("room_participants")
        .select("user_id, profile:profiles!room_participants_user_id_profiles_fkey(username)")
        .eq("room_id", room.id);
      const list: Participant[] = (parts || []).map((p: { user_id: string; profile: { username: string } | { username: string }[] | null }) => ({
        user_id: p.user_id,
        username: (Array.isArray(p.profile) ? p.profile[0]?.username : p.profile?.username) || "Player",
      }));
      // Ensure host first
      list.sort((a, b) => (a.user_id === room.host_id ? -1 : b.user_id === room.host_id ? 1 : 0));
      setParticipants(list);

      // Auto-join if not in room and there's space
      if (!list.find((p) => p.user_id === user.id) && list.length < (room.max_players || 2)) {
        const { error: joinErr } = await supabase.from("room_participants").insert({
          room_id: room.id, user_id: user.id, is_ready: true,
        });
        if (!joinErr && profile) {
          setParticipants((cur) => [...cur, { user_id: user.id, username: profile.username }]);
        }
      }
      setStatus("lobby");
    })();
    return () => { active = false; };
  }, [roomCode, user, profile]);

  // Realtime channel — set up exactly once per room
  useEffect(() => {
    if (!roomId || !user) return;
    const ch = supabase.channel(`chain-reaction:${roomCode}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    const refetchParticipants = async () => {
      const { data } = await supabase
        .from("room_participants")
        .select("user_id, profile:profiles!room_participants_user_id_profiles_fkey(username)")
        .eq("room_id", roomId);
      if (!data) return;
      const list: Participant[] = data.map((p: { user_id: string; profile: { username: string } | { username: string }[] | null }) => ({
        user_id: p.user_id,
        username: (Array.isArray(p.profile) ? p.profile[0]?.username : p.profile?.username) || "Player",
      }));
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
    ch.on("broadcast", { event: "move" }, (payload: { payload: Move }) => {
      moveHandlerRef.current?.(payload.payload);
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, at: Date.now() });
      }
    });
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [roomId, user, roomCode, hostId]);

  if (status === "loading") return <CenterStatus text="Connecting to room…" />;
  if (status === "error")   return (
    <CenterStatus text={errorMsg} action={<button className="btn-neon mt-4" onClick={onExit}>← Back</button>} />
  );
  if (status === "ended")   return (
    <CenterStatus text={errorMsg || "Match ended."} action={
      <div className="flex gap-2 justify-center mt-4">
        <button className="btn-ghost-neon" onClick={onExit}>Back</button>
        <button className="btn-neon" onClick={() => navigate({ to: "/rooms" })}>Rooms</button>
      </div>
    } />
  );

  // Determine slot
  const slot: 0 | 1 | null =
    !user ? null
    : participants[0]?.user_id === user.id ? 0
    : participants[1]?.user_id === user.id ? 1
    : null;
  const isHost = hostId === user?.id;
  const ready = participants.length >= 2 && opponentConnected;

  if (status === "lobby" && !startSignal) {
    return (
      <div className="aspect-video grid place-items-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Online Match</div>
          <h3 className="mt-1 font-display text-2xl font-black neon-text-cyan">Room {roomCode}</h3>
          <div className="mt-4 space-y-2 text-left">
            {[0, 1].map((i) => {
              const p = participants[i];
              return (
                <div key={i} className="flex items-center justify-between rounded-lg bg-black/40 border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: PLAYER_COLORS[i].hex }}>●</span>
                    <span className="font-mono text-sm">{p?.username || "Waiting…"}</span>
                    {p?.user_id === user?.id && <span className="text-[10px] font-mono text-neon-yellow uppercase">you</span>}
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
            <button className="btn-ghost-neon" onClick={onExit}>Leave</button>
            {isHost ? (
              <button
                className="btn-neon disabled:opacity-40"
                disabled={!ready}
                onClick={() => { channelRef.current?.send({ type: "broadcast", event: "start", payload: {} }); setStartSignal((s) => s + 1); }}
              >
                Start Match →
              </button>
            ) : (
              <span className="text-xs font-mono text-muted-foreground self-center">Host will start the match</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (slot === null) {
    return <CenterStatus text="Room is full. Spectating is not supported yet." action={<button className="btn-neon mt-4" onClick={onExit}>← Back</button>} />;
  }

  return (
    <ChainReactionMatch
      key={startSignal}
      players={[participants[0]?.username || "Player 1", participants[1]?.username || "Player 2"]}
      youAre={slot}
      mode="online"
      onMove={(move) => channelRef.current?.send({ type: "broadcast", event: "move", payload: move })}
      onSubscribeMoves={(handler) => {
        moveHandlerRef.current = handler;
        return () => { moveHandlerRef.current = null; };
      }}
      opponentIds={participants.filter((p) => p.user_id !== user?.id).map((p) => p.user_id)}
      roomId={roomId}
      onExit={() => {
        channelRef.current?.send({ type: "broadcast", event: "leave", payload: {} });
        onExit();
      }}
    />
  );
}

function CenterStatus({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="aspect-video grid place-items-center p-6 text-center">
      <div>
        <div className="text-neon-cyan font-mono animate-pulse">{text}</div>
        {action}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MATCH (shared by local + online)
   ────────────────────────────────────────────────────────────────────────── */
type MatchProps = {
  players: [string, string];
  youAre: 0 | 1 | null;          // null = local hot-seat
  mode: "local" | "online";
  onMove: ((m: Move) => void) | null;
  onSubscribeMoves?: (handler: (m: Move) => void) => () => void;
  opponentIds?: string[];
  roomId?: string | null;
  onExit: () => void;
};

function ChainReactionMatch({ players, youAre, mode, onMove, onSubscribeMoves, opponentIds, roomId, onExit }: MatchProps) {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState(0); // even = player 0
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState<Move[]>([]);
  const [winner, setWinner] = useState<0 | 1 | -1>(-1);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const playSound = useSound(muted);
  const recordedRef = useRef(false);

  const current: 0 | 1 = turn % 2 === 0 ? 0 : 1;

  // Timer
  useEffect(() => {
    if (winner !== -1) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [winner]);

  // Subscribe to opponent moves (online)
  useEffect(() => {
    if (mode !== "online" || !onSubscribeMoves) return;
    const unsub = onSubscribeMoves((m) => {
      // Only apply moves not from us
      if (m.by === youAre) return;
      doApply(m, /*broadcast=*/false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLegal = (r: number, c: number, by: 0 | 1) =>
    winner === -1 && !animating && (board[r][c].owner === -1 || board[r][c].owner === by);

  const doApply = useCallback((m: Move, broadcast: boolean) => {
    setBoard((prev) => {
      // Reject out-of-order moves
      if (m.by !== (history.length % 2 === 0 ? 0 : 1) && history.length > 0) return prev;
      const cell = prev[m.r]?.[m.c];
      if (!cell || (cell.owner !== -1 && cell.owner !== m.by)) return prev;
      const next = applyMove(prev, m.r, m.c, m.by);
      const exploded = next[m.r][m.c].count < prev[m.r][m.c].count + 1;
      playSound(exploded ? "explode" : "place");
      setHistory((h) => [...h, m]);
      setTurn((t) => t + 1);
      const w = gameWinner(next);
      if (w !== -1) {
        setWinner(w);
        playSound(w === youAre ? "win" : "lose");
      }
      return next;
    });
    if (broadcast && onMove) onMove(m);
  }, [history.length, onMove, playSound, youAre]);

  const handleClick = (r: number, c: number) => {
    if (winner !== -1 || animating) return;
    if (mode === "online" && youAre !== current) return;
    if (!isLegal(r, c, current)) return;
    setAnimating(true);
    const m: Move = { r, c, turn, by: current };
    doApply(m, /*broadcast=*/true);
    // brief lockout to let cascade settle visually
    setTimeout(() => setAnimating(false), 220);
  };

  // Record stats on win (online only — local hot-seat doesn't credit either user)
  useEffect(() => {
    if (winner === -1 || recordedRef.current) return;
    recordedRef.current = true;
    if (mode === "online" && user && youAre !== null) {
      const result = winner === youAre ? "win" : "loss";
      const duration = (Date.now() - startedAtRef.current) / 1000;
      recordMatchResult(user.id, roomId || null, opponentIds?.[0] || null, result, duration);
    }
  }, [winner, mode, user, youAre, roomId, opponentIds]);

  const reset = () => {
    setBoard(emptyBoard());
    setTurn(0);
    setHistory([]);
    setWinner(-1);
    setAnimating(false);
    startedAtRef.current = Date.now();
    setElapsed(0);
    recordedRef.current = false;
  };

  const turnLabel = winner !== -1
    ? `${players[winner]} wins!`
    : `${players[current]}'s turn`;

  const turnColor = winner !== -1 ? PLAYER_COLORS[winner].hex : PLAYER_COLORS[current].hex;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          {[0, 1].map((i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${current === i && winner === -1 ? `${PLAYER_COLORS[i].bg} border-white/20` : "border-white/10 bg-black/30"}`}>
              <span className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[i].hex, boxShadow: PLAYER_COLORS[i].glow }} />
              <span className={`font-mono text-sm ${PLAYER_COLORS[i].text}`}>{players[i]}</span>
              {mode === "online" && youAre === i && <span className="text-[10px] font-mono text-neon-yellow uppercase">you</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="font-mono text-xs text-muted-foreground">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
          <button onClick={() => setMuted((m) => !m)} className="btn-ghost-neon !py-1.5 !px-2 !text-[11px]" aria-label="Toggle sound">
            {muted ? "🔇" : "🔊"}
          </button>
          {mode === "local" && (
            <button onClick={reset} className="btn-ghost-neon !py-1.5 !px-2 !text-[11px]">Restart</button>
          )}
          <button onClick={onExit} className="btn-ghost-neon !py-1.5 !px-2 !text-[11px] !text-neon-magenta">Leave</button>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="text-center mb-3">
        <div className="font-display font-bold text-base sm:text-lg" style={{ color: turnColor, textShadow: `0 0 8px ${turnColor}` }}>
          {turnLabel}
        </div>
        {mode === "online" && winner === -1 && youAre !== current && (
          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Waiting for opponent…</div>
        )}
      </div>

      {/* Board */}
      <div className="mx-auto select-none" style={{ width: "min(100%, 540px)" }}>
        <div
          className="grid gap-1 sm:gap-1.5 rounded-xl bg-black/50 ring-1 ring-white/10 p-1.5 sm:p-2"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const owner = cell.owner;
              const clickable = mode === "local"
                ? isLegal(r, c, current)
                : (youAre === current && isLegal(r, c, current));
              const color = owner === -1 ? null : PLAYER_COLORS[owner];
              const mass = criticalMass(r, c);
              const willExplode = cell.count >= mass - 1;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleClick(r, c)}
                  disabled={!clickable}
                  className={`relative aspect-square rounded-md transition-all ${color ? "" : "bg-black/40"} ${clickable ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
                  style={{
                    background: color ? `${color.hex}22` : undefined,
                    boxShadow: color
                      ? `inset 0 0 0 1px ${color.hex}66${willExplode ? `, 0 0 14px ${color.hex}88` : ""}`
                      : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                  aria-label={`cell ${r + 1},${c + 1}`}
                >
                  <CellOrbs count={cell.count} hex={color?.hex} pulse={willExplode} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* History */}
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-lg p-3 max-h-40 overflow-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Move history</div>
          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground">No moves yet.</div>
          ) : (
            <ol className="space-y-1 text-xs font-mono">
              {history.slice(-12).reverse().map((m, idx) => (
                <li key={history.length - idx} className="flex justify-between">
                  <span style={{ color: PLAYER_COLORS[m.by].hex }}>{players[m.by]}</span>
                  <span className="text-muted-foreground">→ R{m.r + 1} C{m.c + 1}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="glass rounded-lg p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rules</div>
          <ul className="text-[11px] text-muted-foreground space-y-0.5">
            <li>Tap an empty cell or one of your own to place an orb.</li>
            <li>Corner critical mass: 2 · Edge: 3 · Center: 4.</li>
            <li>At critical mass, the cell explodes into neighbours.</li>
            <li>Eliminate every opposing orb to win.</li>
          </ul>
        </div>
      </div>

      {/* Victory overlay */}
      {winner !== -1 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full text-center ring-2"
               style={{ boxShadow: `0 0 32px ${PLAYER_COLORS[winner].hex}88` }}>
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Match Over</div>
            <h3 className="mt-2 font-display text-3xl font-black" style={{ color: PLAYER_COLORS[winner].hex, textShadow: `0 0 12px ${PLAYER_COLORS[winner].hex}` }}>
              {players[winner]} wins!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Match time: {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")} · Moves: {history.length}
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              {mode === "local" ? (
                <>
                  <button className="btn-neon" onClick={reset}>New Game</button>
                  <button className="btn-ghost-neon" onClick={onExit}>Exit</button>
                </>
              ) : (
                <>
                  <button className="btn-ghost-neon" onClick={onExit}>Leave Match</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Orb rendering inside a cell ───────────────────────────────────────── */
function CellOrbs({ count, hex, pulse }: { count: number; hex?: string; pulse: boolean }) {
  if (!count || !hex) return null;
  // Layout positions (relative offsets in %): support up to 4 orbs
  const positions: Array<[number, number]> = (() => {
    if (count === 1) return [[50, 50]];
    if (count === 2) return [[35, 50], [65, 50]];
    if (count === 3) return [[50, 30], [35, 65], [65, 65]];
    return [[35, 35], [65, 35], [35, 65], [65, 65]];
  })();
  return (
    <div className="absolute inset-0">
      {positions.map(([x, y], i) => (
        <span
          key={i}
          className={`absolute rounded-full ${pulse ? "animate-pulse" : ""}`}
          style={{
            width: "32%",
            height: "32%",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle at 30% 30%, #fff 0%, ${hex} 60%, ${hex} 100%)`,
            boxShadow: `0 0 8px ${hex}`,
          }}
        />
      ))}
    </div>
  );
}
