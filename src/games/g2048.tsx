import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentScore, usePersistentState } from "@/hooks/usePersistentScore";

type Grid = number[][];
const SIZE = 4;

const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  0: { bg: "rgba(255,255,255,0.05)", fg: "transparent" },
  2: { bg: "#1a2540", fg: "#00F5FF" },
  4: { bg: "#1f2a55", fg: "#00F5FF" },
  8: { bg: "#2a1f55", fg: "#FF00AA" },
  16: { bg: "#3a1f55", fg: "#FF00AA" },
  32: { bg: "#55204a", fg: "#FF00AA" },
  64: { bg: "#552040", fg: "#FFE600" },
  128: { bg: "#553820", fg: "#FFE600" },
  256: { bg: "#554c20", fg: "#FFE600" },
  512: { bg: "#395520", fg: "#39FF14" },
  1024: { bg: "#205540", fg: "#39FF14" },
  2048: { bg: "#205555", fg: "#00F5FF" },
};

function empty(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(g: Grid): Grid {
  const empties: [number, number][] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!g[y][x]) empties.push([x, y]);
  if (!empties.length) return g;
  const [x, y] = empties[Math.floor(Math.random() * empties.length)];
  const ng = g.map((r) => [...r]);
  ng[y][x] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((v) => v);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, gained };
}

function move(
  g: Grid,
  dir: "L" | "R" | "U" | "D",
): { grid: Grid; gained: number; changed: boolean } {
  let total = 0;
  const ng = empty();
  if (dir === "L" || dir === "R") {
    for (let y = 0; y < SIZE; y++) {
      const r = dir === "L" ? g[y] : [...g[y]].reverse();
      const { row, gained } = slideRow(r);
      total += gained;
      ng[y] = dir === "L" ? row : row.reverse();
    }
  } else {
    for (let x = 0; x < SIZE; x++) {
      const col = g.map((r) => r[x]);
      const r = dir === "U" ? col : col.reverse();
      const { row, gained } = slideRow(r);
      total += gained;
      const out = dir === "U" ? row : row.reverse();
      for (let y = 0; y < SIZE; y++) ng[y][x] = out[y];
    }
  }
  const changed = JSON.stringify(g) !== JSON.stringify(ng);
  return { grid: ng, gained: total, changed };
}

function isOver(g: Grid): boolean {
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (!g[y][x]) return false;
      if (x < SIZE - 1 && g[y][x] === g[y][x + 1]) return false;
      if (y < SIZE - 1 && g[y][x] === g[y + 1][x]) return false;
    }
  return true;
}

export default function G2048() {
  const [saved, setSaved, loaded] = usePersistentState<{ g: Grid; s: number } | null>(
    "g2048",
    null,
  );
  const [grid, setGrid] = useState<Grid>(empty);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const { highScore, submit } = usePersistentScore("2048");
  const stateRef = useRef({ grid, score, over });
  stateRef.current = { grid, score, over };

  // hydrate from save once
  const hydrated = useRef(false);
  useEffect(() => {
    if (!loaded || hydrated.current) return;
    hydrated.current = true;
    if (saved && saved.g.flat().some((v) => v)) {
      setGrid(saved.g);
      setScore(saved.s);
    } else {
      setGrid(addRandom(addRandom(empty())));
    }
  }, [loaded, saved]);

  // persist
  useEffect(() => {
    if (!hydrated.current) return;
    setSaved({ g: grid, s: score });
  }, [grid, score, setSaved]);

  const doMove = useCallback(
    (dir: "L" | "R" | "U" | "D") => {
      if (stateRef.current.over) return;
      const { grid: ng, gained, changed } = move(stateRef.current.grid, dir);
      if (!changed) return;
      const withNew = addRandom(ng);
      setGrid(withNew);
      setScore((s) => {
        const n = s + gained;
        submit(n);
        return n;
      });
      if (isOver(withNew)) setOver(true);
    },
    [submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, "L" | "R" | "U" | "D"> = {
        ArrowLeft: "L",
        ArrowRight: "R",
        ArrowUp: "U",
        ArrowDown: "D",
        a: "L",
        d: "R",
        w: "U",
        s: "D",
      };
      const d = m[e.key];
      if (d) {
        e.preventDefault();
        doMove(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  // touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "R" : "L");
    else doMove(dy > 0 ? "D" : "U");
  };

  const reset = () => {
    setGrid(addRandom(addRandom(empty())));
    setScore(0);
    setOver(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto w-full max-w-md md:max-w-none">
        <div
          className="relative mx-auto inline-block rounded-xl p-3 bg-black/60 ring-1 ring-neon-yellow/30 touch-none select-none"
          style={{ boxShadow: "0 0 30px oklch(0.92 0.18 100 / 0.25)" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
          >
            {grid.flatMap((row, y) =>
              row.map((v, x) => {
                const c = TILE_COLORS[v] ?? { bg: "#205555", fg: "#00F5FF" };
                return (
                  <div
                    key={`${x}-${y}`}
                    className="grid place-items-center rounded-lg font-display font-black transition-all"
                    style={{
                      width: "clamp(48px, 18vw, 90px)",
                      height: "clamp(48px, 18vw, 90px)",
                      background: c.bg,
                      color: c.fg,
                      fontSize: v >= 1024 ? "1.1rem" : v >= 128 ? "1.35rem" : "1.6rem",
                      boxShadow: v ? `0 0 12px ${c.fg}55, inset 0 0 0 1px ${c.fg}40` : "none",
                    }}
                  >
                    {v || ""}
                  </div>
                );
              }),
            )}
          </div>
          {over && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 rounded-xl">
              <div className="text-center px-4">
                <div className="font-display text-2xl sm:text-3xl font-black neon-text-magenta">
                  GAME OVER
                </div>
                <button onClick={reset} className="btn-neon mt-4">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 max-w-[16rem] mx-auto md:hidden">
          <span />
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => doMove("U")}
            aria-label="Up"
          >
            ↑
          </button>
          <span />
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => doMove("L")}
            aria-label="Left"
          >
            ←
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => doMove("D")}
            aria-label="Down"
          >
            ↓
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => doMove("R")}
            aria-label="Right"
          >
            →
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
          arrows / WASD · swipe · progress saved
        </p>
      </div>

      <aside className="grid gap-3 grid-cols-2 md:grid-cols-1 md:w-56">
        <Stat label="Score" value={score} cls="text-neon-yellow" />
        <Stat label="Best" value={highScore} cls="neon-text-magenta" />
        <button onClick={reset} className="btn-ghost-neon !text-xs col-span-2 md:col-span-1">
          New Game
        </button>
      </aside>
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
