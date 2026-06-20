import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentScore } from "@/hooks/usePersistentScore";

const SIZE = 20;

type Pt = { x: number; y: number };

function randFood(snake: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export default function Snake() {
  const [snake, setSnake] = useState<Pt[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const [food, setFood] = useState<Pt>({ x: 14, y: 10 });
  const [dir, setDir] = useState<Pt>({ x: 1, y: 0 });
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const { highScore, submit } = usePersistentScore("snake");

  const dirRef = useRef(dir); dirRef.current = dir;
  const pendingRef = useRef<Pt | null>(null);

  const reset = () => {
    setSnake([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
    setFood({ x: 14, y: 10 });
    setDir({ x: 1, y: 0 });
    pendingRef.current = null;
    setOver(false); setPaused(false); setScore(0);
  };

  const turn = useCallback((nd: Pt) => {
    const c = dirRef.current;
    if (c.x + nd.x === 0 && c.y + nd.y === 0) return; // can't reverse
    pendingRef.current = nd;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") { setPaused((p) => !p); return; }
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); turn({ x: 0, y: -1 }); }
      else if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); turn({ x: 0, y: 1 }); }
      else if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); turn({ x: -1, y: 0 }); }
      else if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); turn({ x: 1, y: 0 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  useEffect(() => {
    if (over || paused) return;
    const speed = Math.max(60, 160 - Math.floor(score / 5) * 8);
    const id = setInterval(() => {
      setSnake((prev) => {
        const d = pendingRef.current ?? dirRef.current;
        if (pendingRef.current) { setDir(pendingRef.current); pendingRef.current = null; }
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y };
        if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || prev.some((s) => s.x === head.x && s.y === head.y)) {
          setOver(true);
          setScore((s) => { submit(s); return s; });
          return prev;
        }
        const ate = head.x === food.x && head.y === food.y;
        const next = [head, ...prev];
        if (!ate) next.pop();
        else { setScore((s) => s + 1); setFood(randFood(next)); }
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [over, paused, score, food, submit]);

  const cellPx = "clamp(14px, 3.5vw, 22px)";

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto">
        <div className="relative inline-block rounded-lg p-2 bg-black/60 ring-1 ring-neon-green/30" style={{ boxShadow: "0 0 30px oklch(0.85 0.22 145 / 0.25)" }}>
          <div className="grid relative grid-bg" style={{ gridTemplateColumns: `repeat(${SIZE}, ${cellPx})`, gap: 1 }}>
            {Array.from({ length: SIZE * SIZE }).map((_, i) => {
              const x = i % SIZE, y = Math.floor(i / SIZE);
              const isSnake = snake.some((s) => s.x === x && s.y === y);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isFood = food.x === x && food.y === y;
              return (
                <div key={i} style={{
                  width: cellPx, height: cellPx,
                  background: isHead ? "#00F5FF" : isSnake ? "#39FF14" : isFood ? "#FF00AA" : "rgba(255,255,255,0.03)",
                  boxShadow: isFood ? "0 0 12px #FF00AA" : isSnake ? "0 0 6px #39FF14" : "none",
                  borderRadius: 3,
                }} />
              );
            })}
          </div>
          {(over || paused) && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 rounded-lg">
              <div className="text-center">
                <div className="font-display text-3xl font-black neon-text-magenta">{over ? "GAME OVER" : "PAUSED"}</div>
                {over && <button onClick={reset} className="btn-neon mt-4">Play Again</button>}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 max-w-xs mx-auto md:hidden">
          <span />
          <button className="btn-ghost-neon !py-2" onClick={() => turn({ x: 0, y: -1 })}>↑</button>
          <span />
          <button className="btn-ghost-neon !py-2" onClick={() => turn({ x: -1, y: 0 })}>←</button>
          <button className="btn-ghost-neon !py-2" onClick={() => turn({ x: 0, y: 1 })}>↓</button>
          <button className="btn-ghost-neon !py-2" onClick={() => turn({ x: 1, y: 0 })}>→</button>
        </div>
        <p className="mt-3 text-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
          arrows / WASD · P to pause
        </p>
      </div>

      <aside className="grid gap-3 md:w-56">
        <Stat label="Score" value={score} cls="neon-text-cyan" />
        <Stat label="High Score" value={highScore} cls="neon-text-magenta" />
        <Stat label="Length" value={snake.length} cls="text-neon-green" />
        <button onClick={reset} className="btn-ghost-neon !text-xs">New Game</button>
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
