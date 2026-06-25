import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentScore } from "@/hooks/usePersistentScore";

const COLS = 10;
const ROWS = 20;
const COLORS = ["", "#00F5FF", "#FFE600", "#FF00AA", "#8A2BE2", "#39FF14", "#FF6B35", "#3B82F6"];

type Cell = number;
type Board = Cell[][];

const SHAPES: number[][][] = [
  [], // 0
  [[1, 1, 1, 1]], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
  ], // L
];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
function randomPiece() {
  const id = 1 + Math.floor(Math.random() * 7);
  return { shape: SHAPES[id].map((r) => [...r]), x: Math.floor(COLS / 2) - 1, y: 0 };
}
function rotate(shape: number[][]): number[][] {
  const N = shape.length,
    M = shape[0].length;
  const out: number[][] = Array.from({ length: M }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) for (let x = 0; x < M; x++) out[x][N - 1 - y] = shape[y][x];
  return out;
}
function collides(board: Board, shape: number[][], px: number, py: number) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = px + x,
        ny = py + y;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
function merge(board: Board, shape: number[][], px: number, py: number): Board {
  const b = board.map((r) => [...r]);
  for (let y = 0; y < shape.length; y++)
    for (let x = 0; x < shape[y].length; x++)
      if (shape[y][x] && py + y >= 0) b[py + y][px + x] = shape[y][x];
  return b;
}
function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => !c));
  const cleared = ROWS - kept.length;
  const empties = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...empties, ...kept], cleared };
}

export default function Tetris() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState(randomPiece);
  const [next, setNext] = useState(randomPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const { highScore, submit } = usePersistentScore("tetris");

  const pieceRef = useRef(piece);
  pieceRef.current = piece;
  const boardRef = useRef(board);
  boardRef.current = board;

  const tryMove = useCallback((dx: number, dy: number, newShape?: number[][]) => {
    const p = pieceRef.current;
    const shape = newShape ?? p.shape;
    if (!collides(boardRef.current, shape, p.x + dx, p.y + dy)) {
      setPiece({ shape, x: p.x + dx, y: p.y + dy });
      return true;
    }
    return false;
  }, []);

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    const merged = merge(b, p.shape, p.x, p.y);
    const { board: nb, cleared } = clearLines(merged);
    setBoard(nb);
    if (cleared > 0) {
      const points = [0, 40, 100, 300, 1200][cleared] * level;
      setScore((s) => s + points);
      setLines((l) => {
        const newLines = l + cleared;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
    }
    const np = next;
    if (collides(nb, np.shape, np.x, np.y)) {
      setOver(true);
      setScore((s) => {
        submit(s);
        return s;
      });
      return;
    }
    setPiece(np);
    setNext(randomPiece());
  }, [next, level, submit]);

  const drop = useCallback(() => {
    if (!tryMove(0, 1)) lockPiece();
  }, [tryMove, lockPiece]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    let dy = 0;
    while (!collides(boardRef.current, p.shape, p.x, p.y + dy + 1)) dy++;
    setPiece({ ...p, y: p.y + dy });
    setTimeout(() => lockPiece(), 0);
  }, [lockPiece]);

  // tick
  useEffect(() => {
    if (over || paused) return;
    const speed = Math.max(80, 800 - (level - 1) * 60);
    const id = setInterval(drop, speed);
    return () => clearInterval(id);
  }, [drop, level, over, paused]);

  // input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over) return;
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        tryMove(-1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        tryMove(1, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        drop();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        tryMove(0, 0, rotate(pieceRef.current.shape));
      } else if (e.key === " ") {
        e.preventDefault();
        hardDrop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drop, tryMove, hardDrop, paused, over]);

  const reset = () => {
    setBoard(emptyBoard());
    setPiece(randomPiece());
    setNext(randomPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setOver(false);
    setPaused(false);
  };

  // render board with active piece overlaid
  const display = board.map((r) => [...r]);
  for (let y = 0; y < piece.shape.length; y++)
    for (let x = 0; x < piece.shape[y].length; x++)
      if (piece.shape[y][x] && piece.y + y >= 0 && piece.y + y < ROWS)
        display[piece.y + y][piece.x + x] = piece.shape[y][x];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto w-full max-w-md md:max-w-none">
        <div
          className="relative mx-auto inline-block rounded-lg p-2 bg-black/60 ring-1 ring-neon-cyan/30 touch-none select-none"
          style={{ boxShadow: "0 0 30px oklch(0.84 0.18 215 / 0.3)" }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 2 }}
          >
            {display.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="aspect-square"
                  style={{
                    width: "clamp(12px, 7vw, 28px)",
                    background: cell ? COLORS[cell] : "rgba(255,255,255,0.04)",
                    boxShadow: cell
                      ? `0 0 8px ${COLORS[cell]}, inset 0 0 4px rgba(255,255,255,0.4)`
                      : "none",
                    borderRadius: 3,
                  }}
                />
              )),
            )}
          </div>
          {(over || paused) && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 rounded-lg">
              <div className="text-center px-4">
                <div className="font-display text-2xl sm:text-3xl font-black neon-text-magenta">
                  {over ? "GAME OVER" : "PAUSED"}
                </div>
                {over && (
                  <button onClick={reset} className="btn-neon mt-4">
                    Play Again
                  </button>
                )}
                {!over && paused && (
                  <button onClick={() => setPaused(false)} className="btn-neon mt-4">
                    Resume
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile touch controls */}
        <div className="mt-4 grid grid-cols-3 gap-2 max-w-xs mx-auto md:hidden">
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-lg"
            onClick={() => tryMove(0, 0, rotate(pieceRef.current.shape))}
            aria-label="Rotate"
          >
            ⟳
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-lg"
            onClick={hardDrop}
            aria-label="Hard drop"
          >
            ⤓
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-lg"
            onClick={() => setPaused((p) => !p)}
            aria-label="Pause"
          >
            {paused ? "▶" : "⏸"}
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => tryMove(-1, 0)}
            aria-label="Left"
          >
            ←
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => drop()}
            aria-label="Soft drop"
          >
            ↓
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => tryMove(1, 0)}
            aria-label="Right"
          >
            →
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground hidden md:block">
          ← → move · ↑ rotate · ↓ soft drop · space hard drop · p pause
        </p>
      </div>

      <aside className="grid gap-3 grid-cols-2 md:grid-cols-1 md:w-56">
        <Stat label="Score" value={score} accent="cyan" />
        <Stat label="High Score" value={highScore} accent="magenta" />
        <Stat label="Level" value={level} accent="yellow" />
        <Stat label="Lines" value={lines} accent="green" />
        <div className="glass rounded-lg p-3 ring-1 ring-white/10 col-span-2 md:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Next
          </div>
          <div
            className="grid gap-0.5 mx-auto w-fit"
            style={{ gridTemplateColumns: `repeat(${next.shape[0].length}, 18px)` }}
          >
            {next.shape.flatMap((row, y) =>
              row.map((c, x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: 18,
                    height: 18,
                    background: c ? COLORS[c] : "transparent",
                    boxShadow: c ? `0 0 6px ${COLORS[c]}` : "none",
                    borderRadius: 2,
                  }}
                />
              )),
            )}
          </div>
        </div>
        <button onClick={reset} className="btn-ghost-neon !text-xs col-span-2 md:col-span-1">
          New Game
        </button>
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "magenta" | "yellow" | "green";
}) {
  const cls =
    accent === "cyan"
      ? "neon-text-cyan"
      : accent === "magenta"
        ? "neon-text-magenta"
        : accent === "yellow"
          ? "text-neon-yellow"
          : "text-neon-green";
  return (
    <div className="glass rounded-lg p-3 ring-1 ring-white/10">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
