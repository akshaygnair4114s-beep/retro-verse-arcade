import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentScore";

type Cell = "X" | "O" | null;
type Board = Cell[];

const LINES: [number, number, number][] = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWin(b: Board): { winner: Cell; line: [number, number, number] | null } {
  for (const ln of LINES) {
    const [a, c, d] = ln;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: ln };
  }
  return { winner: null, line: null };
}

function aiMove(b: Board, ai: "X" | "O"): number {
  const human = ai === "X" ? "O" : "X";
  // win
  for (let i = 0; i < 9; i++) if (!b[i]) { const t = [...b]; t[i] = ai; if (checkWin(t).winner === ai) return i; }
  // block
  for (let i = 0; i < 9; i++) if (!b[i]) { const t = [...b]; t[i] = human; if (checkWin(t).winner === human) return i; }
  // center, corners, sides
  for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (!b[i]) return i;
  return 0;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [stats, setStats] = usePersistentState("tictactoe", { w: 0, l: 0, d: 0 });

  const { winner, line } = checkWin(board);
  const full = board.every(Boolean);
  const done = !!winner || full;

  const onCell = (i: number) => {
    if (board[i] || done || turn !== "X") return;
    const nb = [...board]; nb[i] = "X";
    setBoard(nb);
    const w = checkWin(nb);
    if (w.winner || nb.every(Boolean)) { resolve(nb); return; }
    setTurn("O");
    setTimeout(() => {
      const move = aiMove(nb, "O");
      const ab = [...nb]; ab[move] = "O";
      setBoard(ab);
      if (checkWin(ab).winner || ab.every(Boolean)) resolve(ab);
      else setTurn("X");
    }, 300);
  };

  const resolve = (b: Board) => {
    const w = checkWin(b).winner;
    setStats((s) => ({
      w: s.w + (w === "X" ? 1 : 0),
      l: s.l + (w === "O" ? 1 : 0),
      d: s.d + (!w && b.every(Boolean) ? 1 : 0),
    }));
  };

  const reset = () => { setBoard(Array(9).fill(null)); setTurn("X"); };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto">
        <div className="grid gap-2 grid-cols-3 p-3 bg-black/60 rounded-xl ring-1 ring-neon-purple/30" style={{ boxShadow: "0 0 30px oklch(0.65 0.24 300 / 0.25)" }}>
          {board.map((c, i) => {
            const inWin = line?.includes(i);
            return (
              <button
                key={i} onClick={() => onCell(i)} disabled={!!c || done || turn !== "X"}
                className="grid place-items-center rounded-lg transition-all font-display font-black text-5xl"
                style={{
                  width: "clamp(72px, 18vw, 110px)", height: "clamp(72px, 18vw, 110px)",
                  background: inWin ? "oklch(0.65 0.24 300 / 0.3)" : "rgba(255,255,255,0.05)",
                  color: c === "X" ? "#00F5FF" : c === "O" ? "#FF00AA" : "transparent",
                  textShadow: c ? `0 0 12px currentColor` : "none",
                  cursor: c || done ? "default" : "pointer",
                }}
              >{c ?? "·"}</button>
            );
          })}
        </div>
        <div className="mt-4 text-center font-display uppercase tracking-widest">
          {winner === "X" && <span className="neon-text-cyan">You win!</span>}
          {winner === "O" && <span className="neon-text-magenta">CPU wins</span>}
          {!winner && full && <span className="text-neon-yellow">Draw</span>}
          {!done && <span className="text-muted-foreground text-sm">{turn === "X" ? "Your move" : "CPU thinking…"}</span>}
        </div>
      </div>
      <aside className="grid gap-3 md:w-56">
        <Stat label="Wins" value={stats.w} cls="neon-text-cyan" />
        <Stat label="Losses" value={stats.l} cls="neon-text-magenta" />
        <Stat label="Draws" value={stats.d} cls="text-neon-yellow" />
        <button onClick={reset} className="btn-ghost-neon !text-xs">New Game</button>
        <button onClick={() => setStats({ w: 0, l: 0, d: 0 })} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Reset record</button>
      </aside>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="glass rounded-lg p-3 ring-1 ring-white/10">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
