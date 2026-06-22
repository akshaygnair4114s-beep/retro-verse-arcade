import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentScore";

// ============================================================
// Sudoku engine — bitmask candidates + MRV backtracking
// ============================================================

type Cell = number; // 0 = empty, 1..9 = value
type Grid = Cell[]; // length 81, row-major

const ALL = (1 << 9) - 1; // 0b111111111

function idx(r: number, c: number) { return r * 9 + c; }
function boxOf(r: number, c: number) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeMasks(grid: Grid) {
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[idx(r, c)];
      if (v) {
        const bit = 1 << (v - 1);
        rows[r] |= bit; cols[c] |= bit; boxes[boxOf(r, c)] |= bit;
      }
    }
  }
  return { rows, cols, boxes };
}

/** Count solutions up to `limit`. Modifies a copy. */
function countSolutions(grid: Grid, limit = 2): number {
  const g = grid.slice();
  const { rows, cols, boxes } = makeMasks(g);
  let found = 0;

  const recurse = (): boolean => {
    // MRV: find empty cell with fewest candidates
    let best = -1;
    let bestCands = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const r = i / 9 | 0, c = i % 9;
      const used = rows[r] | cols[c] | boxes[boxOf(r, c)];
      const cands = ~used & ALL;
      const count = popcount(cands);
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count; best = i; bestCands = cands;
        if (count === 1) break;
      }
    }
    if (best === -1) {
      found++;
      return found >= limit;
    }
    const r = best / 9 | 0, c = best % 9, b = boxOf(r, c);
    let cands = bestCands;
    while (cands) {
      const bit = cands & -cands;
      cands ^= bit;
      g[best] = ctz(bit) + 1;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (recurse()) return true;
      rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
      g[best] = 0;
    }
    return false;
  };
  recurse();
  return found;
}

function popcount(x: number): number {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  return (((x + (x >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}
function ctz(x: number): number {
  let n = 0;
  if (!(x & 0xFFFF)) { n += 16; x >>= 16; }
  if (!(x & 0xFF)) { n += 8; x >>= 8; }
  if (!(x & 0xF)) { n += 4; x >>= 4; }
  if (!(x & 0x3)) { n += 2; x >>= 2; }
  if (!(x & 0x1)) { n += 1; }
  return n;
}

/** Generate a random fully-solved board. */
function generateSolved(): Grid {
  const g: Grid = new Array(81).fill(0);
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);

  const fill = (i: number): boolean => {
    if (i === 81) return true;
    const r = i / 9 | 0, c = i % 9, b = boxOf(r, c);
    const used = rows[r] | cols[c] | boxes[b];
    const order = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const v of order) {
      const bit = 1 << (v - 1);
      if (used & bit) continue;
      g[i] = v;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (fill(i + 1)) return true;
      rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
      g[i] = 0;
    }
    return false;
  };
  fill(0);
  return g;
}

export type Difficulty = "easy" | "medium" | "hard" | "expert";

const CLUE_TARGET: Record<Difficulty, number> = {
  easy: 42,
  medium: 34,
  hard: 30,
  expert: 26,
};

/** Carve a puzzle from a solved board with a guaranteed unique solution. */
function generatePuzzle(diff: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = generateSolved();
  const puzzle = solution.slice();
  const target = CLUE_TARGET[diff];

  // Symmetric removal (180° rotation) for visual appeal — fallback to single if needed.
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;

  for (const i of order) {
    if (clues <= target) break;
    if (puzzle[i] === 0) continue;
    const j = 80 - i;
    const savedI = puzzle[i];
    const savedJ = puzzle[j];
    puzzle[i] = 0;
    if (i !== j) puzzle[j] = 0;
    const removed = (i !== j && savedJ !== 0) ? 2 : 1;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = savedI;
      if (i !== j) puzzle[j] = savedJ;
    } else {
      clues -= removed;
    }
  }

  // If still above target, try single-cell removals to hit goal.
  if (clues > target) {
    for (const i of order) {
      if (clues <= target) break;
      if (puzzle[i] === 0) continue;
      const saved = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[i] = saved;
      else clues -= 1;
    }
  }

  return { puzzle, solution };
}

// ============================================================
// React component
// ============================================================

type CellState = {
  value: number;          // 0 = empty
  notes: number;          // bitmask 1..9
};

type Snapshot = CellState[];

const DIFF_META: Record<Difficulty, { label: string; base: number; color: string }> = {
  easy:   { label: "EASY",   base: 1000, color: "text-neon-green" },
  medium: { label: "MEDIUM", base: 2000, color: "text-neon-cyan" },
  hard:   { label: "HARD",   base: 4000, color: "text-neon-yellow" },
  expert: { label: "EXPERT", base: 8000, color: "text-neon-magenta" },
};

function emptyCells(): Snapshot {
  return Array.from({ length: 81 }, () => ({ value: 0, notes: 0 }));
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export default function Sudoku() {
  const [bestTimes, setBestTimes] = usePersistentState<Record<Difficulty, number>>("sudoku-best-times", {
    easy: 0, medium: 0, hard: 0, expert: 0,
  });
  const [highScores, setHighScores] = usePersistentState<Record<Difficulty, number>>("sudoku-high-scores", {
    easy: 0, medium: 0, hard: 0, expert: 0,
  });

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [started, setStarted] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [puzzle, setPuzzle] = useState<Grid>(() => new Array(81).fill(0));
  const [solution, setSolution] = useState<Grid>(() => new Array(81).fill(0));
  const [cells, setCells] = useState<Snapshot>(emptyCells);
  const [selected, setSelected] = useState<number>(40);
  const [noteMode, setNoteMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [checkFlash, setCheckFlash] = useState<"ok" | "bad" | null>(null);

  // Timer
  useEffect(() => {
    if (!started || paused || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, paused, won]);

  const startNew = useCallback(async (diff: Difficulty) => {
    setGenerating(true);
    setDifficulty(diff);
    // Yield to UI so spinner can render before sync work.
    await new Promise((r) => setTimeout(r, 30));
    const { puzzle, solution } = generatePuzzle(diff);
    const snap: Snapshot = puzzle.map((v) => ({ value: v, notes: 0 }));
    setPuzzle(puzzle);
    setSolution(solution);
    setCells(snap);
    setHistory([]);
    setFuture([]);
    setSelected(puzzle.findIndex((v) => v === 0));
    setHintsUsed(0);
    setSeconds(0);
    setPaused(false);
    setWon(false);
    setNoteMode(false);
    setStarted(true);
    setGenerating(false);
  }, []);

  const pushHistory = (snap: Snapshot) => {
    setHistory((h) => [...h.slice(-99), snap.map((c) => ({ ...c }))]);
    setFuture([]);
  };

  const placeValue = useCallback((i: number, v: number) => {
    if (won || paused) return;
    if (puzzle[i] !== 0) return; // given cell
    pushHistory(cells);
    setCells((prev) => {
      const next = prev.map((c) => ({ ...c }));
      if (noteMode && v !== 0) {
        next[i] = { value: 0, notes: next[i].notes ^ (1 << (v - 1)) };
      } else {
        next[i] = { value: v, notes: 0 };
        if (v !== 0) {
          // Auto-remove that note from same row/col/box
          const r = i / 9 | 0, c = i % 9, b = boxOf(r, c);
          const mask = ~(1 << (v - 1));
          for (let k = 0; k < 81; k++) {
            const rr = k / 9 | 0, cc = k % 9;
            if (rr === r || cc === c || boxOf(rr, cc) === b) next[k].notes &= mask;
          }
        }
      }
      return next;
    });
  }, [won, paused, puzzle, cells, noteMode]);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [cells.map((c) => ({ ...c })), ...f]);
      setCells(prev);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, cells.map((c) => ({ ...c }))]);
      setCells(next);
      return f.slice(1);
    });
  };

  const useHint = () => {
    if (won || paused) return;
    const i = selected;
    if (i < 0 || puzzle[i] !== 0) {
      // Find first empty wrong/blank cell
      const target = cells.findIndex((c, k) => puzzle[k] === 0 && c.value !== solution[k]);
      if (target === -1) return;
      pushHistory(cells);
      setCells((prev) => {
        const n = prev.map((c) => ({ ...c }));
        n[target] = { value: solution[target], notes: 0 };
        return n;
      });
      setSelected(target);
    } else {
      pushHistory(cells);
      setCells((prev) => {
        const n = prev.map((c) => ({ ...c }));
        n[i] = { value: solution[i], notes: 0 };
        return n;
      });
    }
    setHintsUsed((h) => h + 1);
  };

  const checkSolution = () => {
    const anyWrong = cells.some((c, i) => c.value !== 0 && c.value !== solution[i]);
    setCheckFlash(anyWrong ? "bad" : "ok");
    setTimeout(() => setCheckFlash(null), 1100);
  };

  // Error detection (live highlight)
  const conflicts = useMemo(() => {
    const set = new Set<number>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const i = idx(r, c);
        const v = cells[i].value;
        if (!v) continue;
        for (let k = 0; k < 9; k++) {
          if (k !== c && cells[idx(r, k)].value === v) { set.add(i); set.add(idx(r, k)); }
          if (k !== r && cells[idx(k, c)].value === v) { set.add(i); set.add(idx(k, c)); }
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
          const j = idx(rr, cc);
          if (j !== i && cells[j].value === v) { set.add(i); set.add(j); }
        }
      }
    }
    return set;
  }, [cells]);

  // Win detection
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!started || won) return;
    if (cells.every((c, i) => c.value === solution[i])) {
      finishedRef.current = true;
      const m = DIFF_META[difficulty];
      const timeBonus = Math.max(0, m.base - seconds * 2);
      const hintPenalty = hintsUsed * Math.floor(m.base / 8);
      const score = Math.max(50, m.base + timeBonus - hintPenalty);
      setFinalScore(score);
      setWon(true);
      // Persist
      setBestTimes((prev) => ({
        ...prev,
        [difficulty]: prev[difficulty] === 0 ? seconds : Math.min(prev[difficulty], seconds),
      }));
      setHighScores((prev) => ({
        ...prev,
        [difficulty]: Math.max(prev[difficulty], score),
      }));
    }
  }, [cells, solution, started, won, difficulty, seconds, hintsUsed, setBestTimes, setHighScores]);

  // Keyboard
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") { setPaused((p) => !p); return; }
      if (paused || won) return;
      if (e.key === "n" || e.key === "N") { setNoteMode((n) => !n); return; }
      if (e.key === "h" || e.key === "H") { useHint(); return; }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redo(); return; }
      const r = selected / 9 | 0, c = selected % 9;
      if (e.key === "ArrowUp")    { e.preventDefault(); setSelected(idx(Math.max(0, r - 1), c)); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); setSelected(idx(Math.min(8, r + 1), c)); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); setSelected(idx(r, Math.max(0, c - 1))); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setSelected(idx(r, Math.min(8, c + 1))); return; }
      if (/^[1-9]$/.test(e.key)) { placeValue(selected, parseInt(e.key, 10)); return; }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { placeValue(selected, 0); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, paused, won, selected, placeValue]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!started) {
    return (
      <div className="aspect-video min-h-[420px] grid place-items-center p-4 sm:p-6">
        <div className="w-full max-w-md text-center">
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Sudoku</div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">Pick your difficulty</h2>
          <p className="mt-2 text-sm text-muted-foreground">Every puzzle is freshly generated with a unique solution.</p>

          <div className="mt-6 grid gap-2.5">
            {(Object.keys(DIFF_META) as Difficulty[]).map((d) => {
              const m = DIFF_META[d];
              return (
                <button
                  key={d}
                  onClick={() => startNew(d)}
                  disabled={generating}
                  className={`group flex items-center justify-between rounded-lg px-4 py-3 sm:py-4 glass ring-1 ring-white/10 hover:ring-neon-cyan/60 disabled:opacity-50 transition-all`}
                >
                  <span className={`font-display font-black tracking-widest ${m.color}`}>{m.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Best: {bestTimes[d] ? fmtTime(bestTimes[d]) : "—"} · Hi: {highScores[d] || "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {generating && (
            <div className="mt-5 text-xs font-mono text-neon-cyan animate-pulse">Generating puzzle…</div>
          )}
        </div>
      </div>
    );
  }

  const selRow = selected / 9 | 0;
  const selCol = selected % 9;
  const selValue = cells[selected]?.value ?? 0;
  const m = DIFF_META[difficulty];

  // Digit completion counts (for number-pad fade)
  const digitCounts = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) if (cells[i].value) digitCounts[cells[i].value]++;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto w-full max-w-md md:max-w-none">
        {/* Top status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono uppercase tracking-widest">
          <span className={`font-display font-black tracking-widest ${m.color}`}>{m.label}</span>
          <span className="text-neon-cyan tabular-nums">⏱ {fmtTime(seconds)}</span>
          <span className="text-muted-foreground">Hints: <span className="text-neon-magenta">{hintsUsed}</span></span>
        </div>

        {/* Board */}
        <div
          className="relative mx-auto rounded-xl p-1.5 sm:p-2 bg-black/60 ring-1 ring-neon-cyan/30 touch-none select-none w-fit"
          style={{ boxShadow: "0 0 30px oklch(0.84 0.18 215 / 0.3)" }}
        >
          <div className="grid grid-cols-9 bg-neon-cyan/30" style={{ gap: 1 }}>
            {cells.map((cell, i) => {
              const r = i / 9 | 0, c = i % 9;
              const given = puzzle[i] !== 0;
              const isSel = i === selected;
              const sameRowCol = r === selRow || c === selCol;
              const sameValue = selValue !== 0 && cell.value === selValue;
              const conflict = conflicts.has(i);
              // thick borders between 3x3 boxes
              const bt = r % 3 === 0 ? 2 : 0;
              const bl = c % 3 === 0 ? 2 : 0;
              const bb = r === 8 ? 2 : 0;
              const br = c === 8 ? 2 : 0;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`relative grid place-items-center font-display transition-colors ${
                    isSel ? "bg-neon-cyan/25"
                      : conflict ? "bg-neon-magenta/25"
                      : sameValue ? "bg-neon-yellow/15"
                      : sameRowCol ? "bg-white/[0.06]"
                      : "bg-background/80"
                  }`}
                  style={{
                    width: "clamp(28px, 9.2vw, 56px)",
                    height: "clamp(28px, 9.2vw, 56px)",
                    borderTop: bt ? "2px solid oklch(0.84 0.18 215 / 0.7)" : undefined,
                    borderLeft: bl ? "2px solid oklch(0.84 0.18 215 / 0.7)" : undefined,
                    borderBottom: bb ? "2px solid oklch(0.84 0.18 215 / 0.7)" : undefined,
                    borderRight: br ? "2px solid oklch(0.84 0.18 215 / 0.7)" : undefined,
                  }}
                >
                  {cell.value !== 0 ? (
                    <span
                      className={`text-lg sm:text-2xl font-bold ${
                        conflict ? "text-neon-magenta"
                          : given ? "text-foreground"
                          : "text-neon-cyan"
                      }`}
                      style={{ textShadow: !given ? "0 0 8px oklch(0.84 0.18 215 / 0.7)" : undefined }}
                    >
                      {cell.value}
                    </span>
                  ) : cell.notes ? (
                    <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 text-[7px] sm:text-[10px] leading-none text-muted-foreground font-mono">
                      {Array.from({ length: 9 }, (_, k) => (
                        <span key={k} className="grid place-items-center">
                          {cell.notes & (1 << k) ? k + 1 : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {(paused || won || checkFlash) && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 rounded-xl backdrop-blur-sm">
              <div className="text-center px-5 max-w-xs">
                {paused && !won && (
                  <>
                    <div className="font-display text-2xl sm:text-3xl font-black neon-text-magenta">PAUSED</div>
                    <button onClick={() => setPaused(false)} className="btn-neon mt-4">Resume</button>
                  </>
                )}
                {checkFlash && !won && !paused && (
                  <div className={`font-display text-xl sm:text-2xl font-black ${checkFlash === "ok" ? "neon-text-cyan" : "neon-text-magenta"}`}>
                    {checkFlash === "ok" ? "Looking good ✓" : "Errors found ✗"}
                  </div>
                )}
                {won && (
                  <>
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-yellow">Victory</div>
                    <div className="mt-2 font-display text-3xl font-black neon-text-cyan">PUZZLE SOLVED</div>
                    <div className="mt-3 text-sm text-muted-foreground font-mono">
                      Time: <span className="text-neon-cyan">{fmtTime(seconds)}</span><br />
                      Hints used: <span className="text-neon-magenta">{hintsUsed}</span><br />
                      Score: <span className="text-neon-yellow font-bold">{finalScore}</span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 justify-center">
                      <button className="btn-neon" onClick={() => startNew(difficulty)}>New {DIFF_META[difficulty].label}</button>
                      <button className="btn-ghost-neon" onClick={() => setStarted(false)}>Change difficulty</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Number pad */}
        <div className="mt-4 mx-auto w-fit grid grid-cols-9 gap-1.5 sm:gap-2">
          {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => {
            const done = digitCounts[n] >= 9;
            return (
              <button
                key={n}
                onClick={() => placeValue(selected, n)}
                disabled={won || paused}
                className={`grid place-items-center rounded-md font-display text-lg sm:text-xl font-bold transition-all ${
                  done ? "opacity-30 bg-white/5 text-muted-foreground"
                       : "bg-black/40 text-neon-cyan hover:bg-neon-cyan/10 ring-1 ring-neon-cyan/30 active:scale-95"
                }`}
                style={{ width: "clamp(28px, 9.2vw, 48px)", height: "clamp(36px, 11vw, 52px)" }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Action bar */}
        <div className="mt-3 mx-auto w-fit flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <ActionBtn label="Erase" onClick={() => placeValue(selected, 0)} disabled={won || paused} icon="⌫" />
          <ActionBtn label={noteMode ? "Notes ✓" : "Notes"} onClick={() => setNoteMode((n) => !n)} active={noteMode} disabled={won || paused} icon="✎" />
          <ActionBtn label="Undo" onClick={undo} disabled={!history.length || won || paused} icon="↶" />
          <ActionBtn label="Redo" onClick={redo} disabled={!future.length || won || paused} icon="↷" />
          <ActionBtn label="Hint" onClick={useHint} disabled={won || paused} icon="?" />
        </div>

        <p className="mt-3 text-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground hidden sm:block">
          arrows · 1–9 enter · n notes · h hint · p pause · ⌫ erase · ⌘Z undo
        </p>
      </div>

      <aside className="grid gap-3 grid-cols-2 md:grid-cols-1 md:w-56">
        <Stat label="Difficulty" value={m.label} cls={m.color} />
        <Stat label="Time" value={fmtTime(seconds)} cls="neon-text-cyan" />
        <Stat label="Best Time" value={bestTimes[difficulty] ? fmtTime(bestTimes[difficulty]) : "—"} cls="text-neon-green" />
        <Stat label="High Score" value={highScores[difficulty] || 0} cls="neon-text-magenta" />
        <button onClick={() => setPaused((p) => !p)} disabled={won} className="btn-ghost-neon !text-xs col-span-2 md:col-span-1 disabled:opacity-40">
          {paused ? "Resume" : "Pause"}
        </button>
        <button onClick={checkSolution} disabled={won || paused} className="btn-ghost-neon !text-xs col-span-2 md:col-span-1 disabled:opacity-40">
          Check
        </button>
        <button onClick={() => startNew(difficulty)} className="btn-ghost-neon !text-xs col-span-2 md:col-span-1">
          New Puzzle
        </button>
        <button onClick={() => setStarted(false)} className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline col-span-2 md:col-span-1">
          Change difficulty
        </button>
      </aside>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string | number; cls: string }) {
  return (
    <div className="glass rounded-lg p-3 ring-1 ring-white/10">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-black tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function ActionBtn({
  label, onClick, disabled, active, icon,
}: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; icon: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest ring-1 transition-all disabled:opacity-40 ${
        active
          ? "bg-neon-magenta/20 ring-neon-magenta text-neon-magenta"
          : "bg-black/40 ring-white/15 text-muted-foreground hover:text-foreground hover:ring-neon-cyan/40"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
