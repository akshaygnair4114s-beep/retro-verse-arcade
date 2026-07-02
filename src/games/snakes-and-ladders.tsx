import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

// ── Color palette for up to 10 players ──────────────────────────────────
const COLORS = [
  { hex: "#00F5FF", glow: "rgba(0,245,255,0.85)", name: "Cyan" },
  { hex: "#FF00AA", glow: "rgba(255,0,170,0.85)", name: "Magenta" },
  { hex: "#FFE600", glow: "rgba(255,230,0,0.85)", name: "Yellow" },
  { hex: "#39FF14", glow: "rgba(57,255,20,0.85)", name: "Green" },
  { hex: "#FF6600", glow: "rgba(255,102,0,0.85)", name: "Orange" },
  { hex: "#CC00FF", glow: "rgba(204,0,255,0.85)", name: "Purple" },
  { hex: "#FF3355", glow: "rgba(255,51,85,0.85)", name: "Red" },
  { hex: "#4499FF", glow: "rgba(68,153,255,0.85)", name: "Blue" },
  { hex: "#FF88CC", glow: "rgba(255,136,204,0.85)", name: "Pink" },
  { hex: "#DDDDDD", glow: "rgba(221,221,221,0.85)", name: "White" },
];

// ── Classic snakes & ladders positions ───────────────────────────────────
const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};
const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

// ── Board coordinate helpers ─────────────────────────────────────────────
// Square n (1-100) → grid position {x,y} where (0,0) is top-left.
// Row 0 (bottom) = squares 1-10 left→right. Row 1 = 20→11 right→left. etc.
function squareToGrid(n: number): { x: number; y: number } {
  const row = Math.floor((n - 1) / 10); // 0 = bottom row
  const col = (n - 1) % 10;
  return { x: row % 2 === 0 ? col : 9 - col, y: 9 - row };
}

// Visual render index (row-major top-left) → square number
function cellToSquare(gx: number, gy: number): number {
  const row = 9 - gy;
  const col = row % 2 === 0 ? gx : 9 - gx;
  return row * 10 + col + 1;
}

// Square n → SVG center point in viewBox "0 0 100 100"
function squareSVG(n: number): { cx: number; cy: number } {
  const { x, y } = squareToGrid(n);
  return { cx: x * 10 + 5, cy: y * 10 + 5 };
}

// ── Web Audio sound effects ──────────────────────────────────────────────
function beep(type: "dice" | "move" | "ladder" | "snake" | "win") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
    const tone = (freq: number, t0: number, dur: number, wave: OscillatorType = "sine") => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(1, ctx.currentTime + t0);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
      o.connect(env);
      env.connect(master);
      o.start(ctx.currentTime + t0);
      o.stop(ctx.currentTime + t0 + dur + 0.01);
    };
    if (type === "dice")
      for (let i = 0; i < 8; i++) tone(120 + Math.random() * 280, i * 0.065, 0.06, "square");
    if (type === "move") tone(440, 0, 0.06);
    if (type === "ladder") [330, 440, 554, 659].forEach((f, i) => tone(f, i * 0.1, 0.15));
    if (type === "snake")
      [659, 554, 440, 330].forEach((f, i) => tone(f, i * 0.1, 0.12, "sawtooth"));
    if (type === "win") [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.22));
    setTimeout(() => ctx.close().catch(() => undefined), 3000);
  } catch {
    return;
  }
}

// ── Types ────────────────────────────────────────────────────────────────
type Player = { name: string; pos: number; colorIdx: number };
type LogEntry = { id: number; text: string; cls: "normal" | "ladder" | "snake" | "win" };

// ── Dice face component ──────────────────────────────────────────────────
const DOT_POSITIONS: [number, number][][] = [
  [],
  [[1, 1]],
  [
    [0, 2],
    [2, 0],
  ],
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
];

function DiceFace({ val, rolling }: { val: number; rolling: boolean }) {
  const dots = DOT_POSITIONS[val] ?? [];
  return (
    <div
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass ring-2 ring-neon-cyan/70 grid grid-cols-3 grid-rows-3 p-2 gap-0.5 transition-all duration-150"
      style={{
        boxShadow: rolling
          ? "0 0 28px oklch(0.84 0.18 215 / 0.85)"
          : "0 0 10px oklch(0.84 0.18 215 / 0.3)",
        transform: rolling ? "scale(1.1)" : "scale(1)",
      }}
    >
      {Array.from({ length: 9 }, (_, k) => {
        const r = Math.floor(k / 3),
          c = k % 3;
        const filled = dots.some(([dr, dc]) => dr === r && dc === c);
        return (
          <div key={k} className="grid place-items-center">
            {filled && (
              <div
                className="rounded-full bg-neon-cyan"
                style={{
                  width: "clamp(5px, 1.4vw, 10px)",
                  height: "clamp(5px, 1.4vw, 10px)",
                  boxShadow: "0 0 4px oklch(0.84 0.18 215)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Board grid ───────────────────────────────────────────────────────────
function Board({ players }: { players: Player[] }) {
  const posMap = new Map<number, number[]>();
  players.forEach((p, i) => {
    if (p.pos > 0) {
      if (!posMap.has(p.pos)) posMap.set(p.pos, []);
      posMap.get(p.pos)!.push(i);
    }
  });

  // Build SVG snake / ladder overlays
  const svgEls: React.ReactNode[] = [];

  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = squareSVG(+from),
      b = squareSVG(to);
    const dx = b.cx - a.cx,
      dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 1.4,
      ny = (dx / len) * 1.4;
    svgEls.push(
      <g key={`L${from}`} filter="url(#glow-g)" opacity="0.9">
        <line
          x1={a.cx + nx}
          y1={a.cy + ny}
          x2={b.cx + nx}
          y2={b.cy + ny}
          stroke="#22ff66"
          strokeWidth="0.65"
        />
        <line
          x1={a.cx - nx}
          y1={a.cy - ny}
          x2={b.cx - nx}
          y2={b.cy - ny}
          stroke="#22ff66"
          strokeWidth="0.65"
        />
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={a.cx + dx * t - nx * 1.4}
            y1={a.cy + dy * t - ny * 1.4}
            x2={a.cx + dx * t + nx * 1.4}
            y2={a.cy + dy * t + ny * 1.4}
            stroke="#22ff66"
            strokeWidth="0.5"
          />
        ))}
      </g>,
    );
  });

  Object.entries(SNAKES).forEach(([from, to]) => {
    const a = squareSVG(+from),
      b = squareSVG(to);
    const dx = b.cx - a.cx,
      dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * 7,
      py = (dx / len) * 7;
    svgEls.push(
      <path
        key={`S${from}`}
        d={`M ${a.cx} ${a.cy} C ${a.cx + dx / 3 + px} ${a.cy + dy / 3 + py} ${a.cx + (2 * dx) / 3 - px} ${a.cy + (2 * dy) / 3 - py} ${b.cx} ${b.cy}`}
        fill="none"
        stroke="#ff2244"
        strokeWidth="1.4"
        strokeLinecap="round"
        filter="url(#glow-r)"
        opacity="0.95"
      />,
    );
  });

  const cells = Array.from({ length: 100 }, (_, idx) => {
    const gx = idx % 10,
      gy = Math.floor(idx / 10);
    const sq = cellToSquare(gx, gy);
    const isLBase = sq in LADDERS,
      isLTop = Object.values(LADDERS).includes(sq);
    const isSHead = sq in SNAKES,
      isST = Object.values(SNAKES).includes(sq);
    const here = posMap.get(sq) ?? [],
      isFin = sq === 100;

    const bg = isFin
      ? "#1f0a35"
      : isLBase
        ? "#002900"
        : isLTop
          ? "#001900"
          : isSHead
            ? "#2a0000"
            : isST
              ? "#180000"
              : (gy + gx) % 2 === 0
                ? "#100e22"
                : "#140c28";

    return (
      <div
        key={idx}
        className="relative"
        style={{ backgroundColor: bg, border: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Square number */}
        <span
          className={`absolute top-px left-px font-mono leading-none select-none pointer-events-none ${
            isFin
              ? "text-neon-yellow font-bold"
              : isLBase || isLTop
                ? "text-green-400/70"
                : isSHead || isST
                  ? "text-red-400/70"
                  : "text-white/20"
          }`}
          style={{ fontSize: "clamp(4px, 0.8vw, 8px)" }}
        >
          {sq}
        </span>

        {/* Emoji markers */}
        {isLBase && (
          <span
            className="absolute bottom-px right-px pointer-events-none"
            style={{ fontSize: "clamp(5px, 1vw, 11px)" }}
          >
            🪜
          </span>
        )}
        {isSHead && (
          <span
            className="absolute bottom-px right-px pointer-events-none"
            style={{ fontSize: "clamp(5px, 1vw, 11px)" }}
          >
            🐍
          </span>
        )}
        {isFin && (
          <span
            className="absolute inset-0 grid place-items-center pointer-events-none"
            style={{ fontSize: "clamp(9px, 1.8vw, 22px)" }}
          >
            🏆
          </span>
        )}

        {/* Player tokens */}
        {here.length > 0 && (
          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-px p-px pointer-events-none">
            {here.map((pi) => (
              <div
                key={pi}
                className="rounded-full flex items-center justify-center font-display font-black shrink-0"
                style={{
                  width: "clamp(8px, 2.1vw, 20px)",
                  height: "clamp(8px, 2.1vw, 20px)",
                  fontSize: "clamp(4px, 0.65vw, 7px)",
                  backgroundColor: COLORS[players[pi].colorIdx].hex,
                  boxShadow: `0 0 6px ${COLORS[players[pi].colorIdx].glow}`,
                  color: "#000",
                  zIndex: 10 + pi,
                }}
              >
                {pi + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden ring-1 ring-neon-cyan/20"
      style={{ aspectRatio: "1/1", boxShadow: "0 0 24px oklch(0.84 0.18 215 / 0.12)" }}
    >
      <div
        className="grid grid-cols-10 w-full h-full"
        style={{ gridTemplateRows: "repeat(10, 1fr)" }}
      >
        {cells}
      </div>
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow-g">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-r">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {svgEls}
      </svg>
    </div>
  );
}

// ── Rules screen ─────────────────────────────────────────────────────────
function RulesScreen({
  onPlay,
  onBack,
  onClose,
}: {
  onPlay?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const RULES = [
    { icon: "🎯", t: "Objective", d: "Be the first player to land exactly on square 100 to win!" },
    {
      icon: "🎲",
      t: "Your Turn",
      d: "Press Roll Dice. Your token moves forward by the number rolled (1–6). Players alternate turns.",
    },
    {
      icon: "🪜",
      t: "Ladders — Up!",
      d: "Land on the bottom of a ladder and you instantly climb to the top — a big shortcut!",
    },
    {
      icon: "🐍",
      t: "Snakes — Down!",
      d: "Land on a snake's head and you slide all the way down to its tail. Watch out!",
    },
    {
      icon: "🏆",
      t: "Winning",
      d: "You must land EXACTLY on square 100. If the roll would take you past 100, you stay in place.",
    },
  ];
  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow text-center">
        How to play
      </div>
      <h2 className="mt-1 font-display text-2xl font-black neon-text-cyan text-center">Rules</h2>
      <div className="mt-5 space-y-3">
        {RULES.map((r) => (
          <div
            key={r.t}
            className="glass rounded-xl p-4 ring-1 ring-white/10 flex gap-3 items-start"
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{r.icon}</span>
            <div>
              <div className="font-display font-bold text-sm text-foreground">{r.t}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{r.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 justify-center">
        {onPlay && (
          <button onClick={onPlay} className="btn-neon">
            ▶ Start Game
          </button>
        )}
        {onBack && (
          <button onClick={onBack} className="btn-ghost-neon">
            ← Back
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="btn-ghost-neon">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ── Setup screen ──────────────────────────────────────────────────────────
function SetupScreen({ onNext }: { onNext: (players: Player[]) => void }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: 10 }, (_, i) => `Player ${i + 1}`),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(
      Array.from({ length: count }, (_, i) => ({
        name: (names[i] || `Player ${i + 1}`).trim().slice(0, 16),
        pos: 0,
        colorIdx: i,
      })),
    );
  };

  return (
    <div className="flex flex-col items-center py-6 px-4 min-h-[420px]">
      <div className="w-full max-w-lg">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow text-center">
          Multiplayer · 2–10P
        </div>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-black neon-text-cyan text-center">
          Snakes &amp; Ladders
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Classic board game for 2–10 players.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Number of players
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`w-9 h-9 rounded-lg font-display font-bold text-sm ring-1 transition-all ${
                    count === n
                      ? "bg-neon-cyan/20 ring-neon-cyan text-neon-cyan"
                      : "bg-black/30 ring-white/10 text-muted-foreground hover:ring-neon-cyan/40 hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Player names
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/20"
                    style={{
                      backgroundColor: COLORS[i].hex,
                      boxShadow: `0 0 6px ${COLORS[i].glow}`,
                    }}
                  />
                  <input
                    value={names[i]}
                    onChange={(e) => {
                      const n = [...names];
                      n[i] = e.target.value;
                      setNames(n);
                    }}
                    maxLength={16}
                    placeholder={`Player ${i + 1}`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-neon-cyan placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-cyan/60"
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-neon w-full">
            View Rules &amp; Play →
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main game component ───────────────────────────────────────────────────
function GameBoard({ initial, onNewGame }: { initial: Player[]; onNewGame: () => void }) {
  const [players, setPlayers] = useState<Player[]>(initial);
  const [cur, setCur] = useState(0);
  const [diceVal, setDiceVal] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ msg: string; cls: "ladder" | "snake" } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const logId = useRef(0);
  const spinRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stepRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const touts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      clearInterval(spinRef.current);
      clearInterval(stepRef.current);
      touts.current.forEach(clearTimeout);
    },
    [],
  );

  const addLog = useCallback((text: string, cls: LogEntry["cls"] = "normal") => {
    setLog((prev) => [{ id: logId.current++, text, cls }, ...prev].slice(0, 30));
  }, []);

  const delay = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    touts.current.push(id);
  };

  const handleRoll = useCallback(() => {
    if (rolling || busy || winner !== null) return;
    clearInterval(spinRef.current);
    clearInterval(stepRef.current);
    touts.current.forEach(clearTimeout);
    touts.current = [];

    const player = players[cur];
    const fromPos = player.pos;

    setRolling(true);
    beep("dice");

    let ticks = 0;
    spinRef.current = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks < 15) return;

      clearInterval(spinRef.current);
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceVal(roll);
      setRolling(false);

      const target = fromPos + roll;
      addLog(`${player.name} rolled a ${roll}`);

      // Would overshoot 100 → stay in place
      if (target > 100) {
        addLog(`${player.name} needs ${100 - fromPos} to win — stays at ${fromPos || "Start"}!`);
        delay(() => setCur((c) => (c + 1) % players.length), 1000);
        return;
      }

      // Animate step-by-step movement
      setBusy(true);
      let pos = fromPos;

      stepRef.current = setInterval(() => {
        pos++;
        beep("move");
        setPlayers((prev) => {
          const next = [...prev];
          next[cur] = { ...next[cur], pos };
          return next;
        });
        if (pos < target) return;

        clearInterval(stepRef.current);

        // Resolve snake / ladder
        delay(() => {
          let final = target;

          if (LADDERS[target]) {
            final = LADDERS[target];
            beep("ladder");
            setFlash({
              msg: `🪜 ${player.name} climbed a ladder! ${target} → ${final}`,
              cls: "ladder",
            });
            addLog(`🪜 Ladder! ${player.name}: ${target} → ${final}`, "ladder");
            setPlayers((prev) => {
              const next = [...prev];
              next[cur] = { ...next[cur], pos: final };
              return next;
            });
          } else if (SNAKES[target]) {
            final = SNAKES[target];
            beep("snake");
            setFlash({ msg: `🐍 ${player.name} hit a snake! ${target} → ${final}`, cls: "snake" });
            addLog(`🐍 Snake! ${player.name}: ${target} → ${final}`, "snake");
            setPlayers((prev) => {
              const next = [...prev];
              next[cur] = { ...next[cur], pos: final };
              return next;
            });
          }

          const pauseMs = LADDERS[target] || SNAKES[target] ? 1600 : 350;
          delay(() => {
            setFlash(null);
            if (final === 100) {
              beep("win");
              setWinner(cur);
              addLog(`🏆 ${player.name} wins!`, "win");
            } else {
              setCur((c) => (c + 1) % players.length);
            }
            setBusy(false);
          }, pauseMs);
        }, 250);
      }, 190);
    }, 70);
  }, [rolling, busy, winner, players, cur, addLog]);

  const restart = useCallback(() => {
    clearInterval(spinRef.current);
    clearInterval(stepRef.current);
    touts.current.forEach(clearTimeout);
    touts.current = [];
    setPlayers(initial.map((p) => ({ ...p, pos: 0 })));
    setCur(0);
    setDiceVal(1);
    setRolling(false);
    setBusy(false);
    setWinner(null);
    setLog([]);
    setFlash(null);
  }, [initial]);

  const cp = players[cur];

  return (
    <div className="relative">
      {/* Rules overlay */}
      {showRules && (
        <div className="absolute inset-0 z-50 bg-background/96 rounded-xl overflow-y-auto">
          <RulesScreen onClose={() => setShowRules(false)} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_248px] items-start">
        {/* ── Board ── */}
        <div className="relative">
          {/* Snake/Ladder flash */}
          {flash && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-xl">
              <div
                className={`font-display font-black text-sm sm:text-lg text-center px-4 py-2 rounded-xl glass ring-1 mx-3 ${
                  flash.cls === "ladder"
                    ? "ring-neon-green text-neon-green"
                    : "ring-neon-magenta text-neon-magenta"
                }`}
              >
                {flash.msg}
              </div>
            </div>
          )}

          {/* Winner overlay */}
          {winner !== null && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/88 rounded-xl backdrop-blur-sm">
              <div className="text-center px-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-yellow">
                  Champion!
                </div>
                <div className="mt-2 font-display text-3xl sm:text-4xl font-black neon-text-cyan">
                  {players[winner].name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground font-mono">
                  Reached square 100! 🏆
                </div>
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  <button className="btn-neon" onClick={onNewGame}>
                    New Game
                  </button>
                  <button className="btn-ghost-neon" onClick={restart}>
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}

          <Board players={players} />
        </div>

        {/* ── Sidebar ── */}
        <aside className="grid gap-3 grid-cols-2 lg:grid-cols-1">
          {/* Current turn */}
          <div className="glass rounded-xl p-3 ring-1 ring-white/10">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Current Turn
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: COLORS[cp.colorIdx].hex,
                  boxShadow: `0 0 8px ${COLORS[cp.colorIdx].glow}`,
                }}
              />
              <span className="font-display font-bold text-base neon-text-cyan truncate">
                {cp.name}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
              Square: <span className="text-foreground font-bold">{cp.pos || "Start"}</span>
            </div>
          </div>

          {/* Dice + Roll button */}
          <div className="glass rounded-xl p-3 ring-1 ring-white/10 flex flex-col items-center gap-3">
            <DiceFace val={diceVal} rolling={rolling} />
            <button
              onClick={handleRoll}
              disabled={rolling || busy || winner !== null}
              className="btn-neon w-full disabled:opacity-40 !text-sm"
            >
              {rolling ? "Rolling…" : busy ? "Moving…" : "🎲 Roll Dice"}
            </button>
          </div>

          {/* Players list */}
          <div className="glass rounded-xl p-3 ring-1 ring-white/10 col-span-2 lg:col-span-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Players
            </div>
            <div className="space-y-1">
              {players.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    i === cur && !winner ? "bg-white/[0.07] ring-1 ring-white/10" : ""
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: COLORS[p.colorIdx].hex,
                      boxShadow: `0 0 4px ${COLORS[p.colorIdx].glow}`,
                    }}
                  />
                  <span className="font-mono truncate flex-1 text-foreground/90">{p.name}</span>
                  <span className="font-mono tabular-nums text-neon-cyan text-[10px]">
                    {p.pos || "—"}
                  </span>
                  {winner === i && <span>👑</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Game log */}
          <div className="glass rounded-xl p-3 ring-1 ring-white/10 col-span-2 lg:col-span-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Game Log
            </div>
            <div className="space-y-0.5 max-h-28 sm:max-h-36 overflow-y-auto">
              {log.length === 0 ? (
                <div className="text-[10px] text-muted-foreground font-mono italic">
                  No moves yet…
                </div>
              ) : (
                log.map((l) => (
                  <div
                    key={l.id}
                    className={`text-[10px] font-mono leading-snug ${
                      l.cls === "ladder"
                        ? "text-neon-green"
                        : l.cls === "snake"
                          ? "text-neon-magenta"
                          : l.cls === "win"
                            ? "text-neon-yellow"
                            : "text-muted-foreground"
                    }`}
                  >
                    {l.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action buttons */}
          <button onClick={() => setShowRules(true)} className="btn-ghost-neon !text-xs">
            📖 Rules
          </button>
          <button onClick={restart} className="btn-ghost-neon !text-xs">
            ↺ Restart
          </button>
          <button onClick={onNewGame} className="btn-ghost-neon !text-xs col-span-2 lg:col-span-1">
            ✦ New Game
          </button>
        </aside>
      </div>
    </div>
  );
}

// ── Online multiplayer wrapper ─────────────────────────────────────────────
function OnlineGame({ roomCode, onExit }: { roomCode: string; onExit: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ id: string; username: string } | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [mySlot, setMySlot] = useState(0);
  const [started, setStarted] = useState(false);
  const [initialPlayers, setInitialPlayers] = useState<Player[] | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data: room, error: roomErr } = await supabase
          .from("game_rooms")
          .select("id, game_type, status, max_players")
          .eq("code", roomCode)
          .maybeSingle();

        if (roomErr || !room) {
          if (mounted) setError("Room not found");
          return;
        }

        const gt = (room.game_type || "").toLowerCase().replace(/-/g, "");
        if (gt !== "snakesladders" && gt !== "snakesandladders") {
          if (mounted) setError("This room is for a different game");
          return;
        }

        const { data: participants } = await supabase
          .from("room_participants")
          .select("id, user_id, joined_at, profile:profiles!room_participants_user_id_profiles_fkey(username)")
          .eq("room_id", room.id)
          .order("joined_at", { ascending: true });

        if (!participants || participants.length === 0) {
          if (mounted) setError("No participants in room");
          return;
        }

        const slot = participants.findIndex((p) => p.user_id === user.id);
        if (slot === -1) {
          if (participants.length >= room.max_players) {
            if (mounted) setError("Room is full");
            return;
          }
          const { error: joinErr } = await supabase.from("room_participants").insert({
            room_id: room.id,
            user_id: user.id,
            is_ready: true,
          });
          if (joinErr) {
            if (mounted) setError("Failed to join room: " + joinErr.message);
            return;
          }
          if (mounted) setMySlot(participants.length);
        } else {
          if (mounted) setMySlot(slot);
        }

        const otherP = participants.find((p) => p.user_id !== user.id);
        if (otherP && mounted) {
          const profileData = otherP.profile as unknown as { username: string } | null;
          setOpponent({ id: otherP.user_id, username: profileData?.username || "Player" });
        }

        if (mounted) setLoading(false);

        const channel = supabase.channel(`snakes-ladders:${roomCode}`, {
          private: true,
          presence: { key: user.id },
          broadcast: { self: false },
        });

        channelRef.current = channel;

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            if (mounted) setOpponentConnected(count >= 2);
          })
          .on("broadcast", { event: "start" }, () => {
            if (mounted) setStarted(true);
          })
          .on("broadcast", { event: "leave" }, () => {
            if (mounted) setOpponentConnected(false);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.track({ user_id: user.id });
            }
          });
      } catch {
        if (mounted) setError("Failed to connect");
      }
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [roomCode, user, navigate]);

  useEffect(() => {
    if (started && !initialPlayers) {
      const names = ["You", opponent?.username || "Player 2"];
      setInitialPlayers([
        { name: mySlot === 0 ? names[0] : names[1], pos: 0, colorIdx: mySlot === 0 ? 0 : 1 },
        { name: mySlot === 0 ? names[1] : names[0], pos: 0, colorIdx: mySlot === 0 ? 1 : 0 },
      ]);
    }
  }, [started, initialPlayers, opponent, mySlot]);

  const handleStart = () => {
    channelRef.current?.send({ type: "broadcast", event: "start", payload: {} });
    setStarted(true);
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <div className="text-neon-cyan font-mono animate-pulse">Connecting to room {roomCode}…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <div>
          <div className="text-neon-magenta font-display text-xl mb-3">{error}</div>
          <button onClick={onExit} className="btn-ghost-neon">Back to Menu</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="grid place-items-center py-12">
        <div className="glass rounded-xl p-6 max-w-md w-full text-center">
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow mb-2">
            Room {roomCode}
          </div>
          <h2 className="font-display text-2xl font-black neon-text-cyan mb-4">
            Snakes & Ladders
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={`w-3 h-3 rounded-full ${opponentConnected ? "bg-neon-green" : "bg-muted-foreground/40"}`} />
            <span className="text-sm font-mono">
              {opponentConnected ? "Opponent connected" : "Waiting for opponent…"}
            </span>
          </div>
          {opponent && (
            <div className="text-sm text-muted-foreground mb-4">
              vs <span className="text-neon-cyan font-mono">{opponent.username}</span>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleStart}
              disabled={!opponentConnected}
              className="btn-neon disabled:opacity-50"
            >
              Start Match
            </button>
            <button onClick={onExit} className="btn-ghost-neon">Leave</button>
          </div>
        </div>
      </div>
    );
  }

  if (!initialPlayers) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${opponentConnected ? "bg-neon-green" : "bg-neon-magenta"}`} />
          <span className="text-xs font-mono">
            {opponentConnected ? "● Live" : "● Reconnecting…"}
          </span>
        </div>
        <button onClick={onExit} className="btn-ghost-neon !text-xs">Leave Room</button>
      </div>
      <GameBoard initial={initialPlayers} onNewGame={() => setInitialPlayers(null)} />
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────
export default function SnakesAndLadders() {
  const search = useSearch({ strict: false }) as { room?: string };
  const roomCode = typeof search?.room === "string" ? search.room.toUpperCase() : null;
  const [phase, setPhase] = useState<"setup" | "rules" | "game" | "online">(
    roomCode ? "online" : "setup",
  );
  const [players, setPlayers] = useState<Player[]>([]);

  if (phase === "online" && roomCode) {
    return <OnlineGame roomCode={roomCode} onExit={() => setPhase("setup")} />;
  }

  if (phase === "setup") {
    return (
      <SetupScreen
        onNext={(ps) => {
          setPlayers(ps);
          setPhase("rules");
        }}
      />
    );
  }
  if (phase === "rules") {
    return <RulesScreen onPlay={() => setPhase("game")} onBack={() => setPhase("setup")} />;
  }
  return (
    <GameBoard
      key={players.map((p) => p.name).join("|")}
      initial={players}
      onNewGame={() => setPhase("setup")}
    />
  );
}
