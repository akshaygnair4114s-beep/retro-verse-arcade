import { useEffect, useRef, useState } from "react";
import { usePersistentScore } from "@/hooks/usePersistentScore";

const W = 640,
  H = 400;
const PADDLE_H = 70,
  PADDLE_W = 10;
const BALL = 9;

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState({ p: 0, ai: 0 });
  const [running, setRunning] = useState(true);
  const { highScore, submit } = usePersistentScore("pong");
  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const state = {
      py: H / 2 - PADDLE_H / 2,
      ay: H / 2 - PADDLE_H / 2,
      bx: W / 2,
      by: H / 2,
      vx: 5,
      vy: 3,
      up: false,
      down: false,
      mouseY: null as number | null,
    };

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        state.up = down;
        e.preventDefault();
      }
      if (e.key === "ArrowDown" || e.key === "s") {
        state.down = down;
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mouseY = ((e.clientY - rect.top) / rect.height) * H;
    };
    canvas.addEventListener("pointermove", move);

    const resetBall = (dir: number) => {
      state.bx = W / 2;
      state.by = H / 2;
      state.vx = 5 * dir;
      state.vy = Math.random() * 4 - 2;
    };

    const loop = () => {
      if (!running) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // input
      if (state.mouseY !== null) {
        state.py += (state.mouseY - PADDLE_H / 2 - state.py) * 0.25;
      } else {
        if (state.up) state.py -= 7;
        if (state.down) state.py += 7;
      }
      state.py = Math.max(0, Math.min(H - PADDLE_H, state.py));
      // AI
      const target = state.by - PADDLE_H / 2;
      state.ay += Math.max(-5, Math.min(5, target - state.ay));
      state.ay = Math.max(0, Math.min(H - PADDLE_H, state.ay));
      // ball
      state.bx += state.vx;
      state.by += state.vy;
      if (state.by < 0 || state.by > H - BALL) state.vy *= -1;
      // collisions
      if (
        state.bx < 20 + PADDLE_W &&
        state.by + BALL > state.py &&
        state.by < state.py + PADDLE_H &&
        state.vx < 0
      ) {
        state.vx *= -1.05;
        state.vx = Math.min(state.vx, 12);
        const hit = (state.by - (state.py + PADDLE_H / 2)) / (PADDLE_H / 2);
        state.vy = hit * 6;
      }
      if (
        state.bx > W - 20 - PADDLE_W - BALL &&
        state.by + BALL > state.ay &&
        state.by < state.ay + PADDLE_H &&
        state.vx > 0
      ) {
        state.vx *= -1.05;
        state.vx = Math.max(state.vx, -12);
        const hit = (state.by - (state.ay + PADDLE_H / 2)) / (PADDLE_H / 2);
        state.vy = hit * 6;
      }
      if (state.bx < 0) {
        setScore((s) => ({ ...s, ai: s.ai + 1 }));
        resetBall(1);
      }
      if (state.bx > W) {
        setScore((s) => {
          const ns = { ...s, p: s.p + 1 };
          submit(ns.p);
          return ns;
        });
        resetBall(-1);
      }

      // draw
      ctx.fillStyle = "rgba(10,10,15,1)";
      ctx.fillRect(0, 0, W, H);
      // center line
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      // paddles
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#00F5FF";
      ctx.fillStyle = "#00F5FF";
      ctx.fillRect(20, state.py, PADDLE_W, PADDLE_H);
      ctx.shadowColor = "#FF00AA";
      ctx.fillStyle = "#FF00AA";
      ctx.fillRect(W - 20 - PADDLE_W, state.ay, PADDLE_W, PADDLE_H);
      // ball
      ctx.shadowColor = "#FFE600";
      ctx.fillStyle = "#FFE600";
      ctx.fillRect(state.bx, state.by, BALL, BALL);
      ctx.shadowBlur = 0;
      // scores
      ctx.font = "bold 48px Orbitron, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "center";
      ctx.fillText(String(scoreRef.current.p), W / 2 - 60, 60);
      ctx.fillText(String(scoreRef.current.ai), W / 2 + 60, 60);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointermove", move);
    };
  }, [running, submit]);

  const setPaddleDir = (up: boolean, down: boolean) => {
    // Mobile button helpers — dispatch synthetic key events to existing handler
    const key = up ? "ArrowUp" : down ? "ArrowDown" : null;
    if (!key) return;
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key })), 120);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
      <div className="mx-auto w-full max-w-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-lg ring-1 ring-neon-cyan/30 touch-none select-none"
          style={{
            boxShadow: "0 0 30px oklch(0.84 0.18 215 / 0.3)",
            aspectRatio: `${W} / ${H}`,
            height: "auto",
          }}
        />
        <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto md:hidden">
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => setPaddleDir(true, false)}
            aria-label="Up"
          >
            ↑
          </button>
          <button
            className="btn-ghost-neon !py-3 !px-0 !text-xl"
            onClick={() => setPaddleDir(false, true)}
            aria-label="Down"
          >
            ↓
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
          touch / drag · mouse · ↑↓ / W S · outlast the AI
        </p>
      </div>
      <aside className="grid gap-3 grid-cols-3 md:grid-cols-1 md:w-56">
        <Stat label="You" value={score.p} cls="neon-text-cyan" />
        <Stat label="CPU" value={score.ai} cls="neon-text-magenta" />
        <Stat label="High Score" value={highScore} cls="text-neon-yellow" />
        <button
          onClick={() => {
            setScore({ p: 0, ai: 0 });
            setRunning(true);
          }}
          className="btn-ghost-neon !text-xs col-span-3 md:col-span-1"
        >
          Reset
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="btn-ghost-neon !text-xs col-span-3 md:col-span-1"
        >
          {running ? "Pause" : "Resume"}
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
      <div className={`font-display text-3xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
