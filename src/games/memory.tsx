import { useEffect, useMemo, useState } from "react";
import { sanitizePlayerName } from "@/hooks/usePlayerName";

const FOODS = ["🍕", "🍔", "🍟", "🌮", "🍩", "🍣", "🍎", "🍇", "🍉", "🍓", "🥑", "🍍"];

type Card = { id: number; food: string; matched: boolean; flipped: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairCount: number): Card[] {
  const picks = shuffle(FOODS).slice(0, pairCount);
  const doubled = picks.flatMap((f) => [f, f]);
  return shuffle(doubled).map((food, i) => ({ id: i, food, matched: false, flipped: false }));
}

const PAIR_COUNT = 8; // 16 cards = 4x4

export default function MemoryGame() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [started, setStarted] = useState(false);
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");

  if (!started) {
    const c1 = sanitizePlayerName(d1);
    const c2 = sanitizePlayerName(d2);
    const ok = c1.length >= 2 && c2.length >= 2 && c1.toLowerCase() !== c2.toLowerCase();
    return (
      <div className="aspect-video grid place-items-center p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!ok) return;
            setP1(c1); setP2(c2); setStarted(true);
          }}
          className="w-full max-w-md text-center"
        >
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">2 Player Mode</div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">Enter both player names</h2>
          <p className="mt-2 text-sm text-muted-foreground">Match the food pairs. Most pairs wins.</p>
          <div className="mt-5 grid gap-3">
            <input
              autoFocus value={d1} onChange={(e) => setD1(e.target.value.slice(0, 16))}
              maxLength={16} placeholder="PLAYER 1" aria-label="Player 1 name"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 font-mono text-center text-lg tracking-widest uppercase text-neon-cyan placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan"
            />
            <input
              value={d2} onChange={(e) => setD2(e.target.value.slice(0, 16))}
              maxLength={16} placeholder="PLAYER 2" aria-label="Player 2 name"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 font-mono text-center text-lg tracking-widest uppercase text-neon-magenta placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-magenta"
            />
          </div>
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
            2–16 chars each · names must differ
          </div>
          <button type="submit" disabled={!ok} className="btn-neon mt-5 disabled:opacity-40">Start Match →</button>
        </form>
      </div>
    );
  }

  return <MemoryBoard p1={p1} p2={p2} onReset={() => setStarted(false)} />;
}

function MemoryBoard({ p1, p2, onReset }: { p1: string; p2: string; onReset: () => void }) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck(PAIR_COUNT));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [lock, setLock] = useState(false);
  const [round, setRound] = useState(0);

  const names = [p1, p2] as const;

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLock(true);
    const [a, b] = flipped;
    const ca = cards.find((c) => c.id === a)!;
    const cb = cards.find((c) => c.id === b)!;
    const match = ca.food === cb.food;
    const t = setTimeout(() => {
      setCards((prev) => prev.map((c) =>
        c.id === a || c.id === b ? { ...c, matched: match, flipped: match } : c
      ));
      if (match) {
        setScores((s) => {
          const ns: [number, number] = [...s] as [number, number];
          ns[turn] += 1;
          return ns;
        });
      } else {
        setTurn((t) => (t === 0 ? 1 : 0));
      }
      setFlipped([]);
      setLock(false);
    }, 850);
    return () => clearTimeout(t);
  }, [flipped, cards, turn]);

  const onFlip = (id: number) => {
    if (lock) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped) return;
    if (flipped.includes(id)) return;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setFlipped((f) => [...f, id]);
  };

  const done = useMemo(() => cards.every((c) => c.matched), [cards]);
  const winner = scores[0] === scores[1] ? "Tie" : scores[0] > scores[1] ? p1 : p2;

  const reset = () => {
    setCards(buildDeck(PAIR_COUNT));
    setFlipped([]);
    setTurn(0);
    setScores([0, 0]);
    setLock(false);
    setRound((r) => r + 1);
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => {
          const active = turn === i && !done;
          const color = i === 0 ? "cyan" : "magenta";
          return (
            <div
              key={i}
              className={`rounded-xl border p-3 transition ${
                active ? `border-neon-${color} bg-white/5` : "border-white/10 bg-black/30"
              }`}
            >
              <div className={`font-mono text-[10px] uppercase tracking-widest ${active ? `text-neon-${color}` : "text-muted-foreground"}`}>
                Player {i + 1} {active && "· your turn"}
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div className={`font-display text-lg truncate ${i === 0 ? "neon-text-cyan" : "neon-text-magenta"}`}>{names[i]}</div>
                <div className="font-mono text-xl">{scores[i]}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div key={round} className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => onFlip(c.id)}
            disabled={c.matched || lock}
            aria-label={c.flipped || c.matched ? `Card ${c.food}` : "Hidden card"}
            className={`aspect-square rounded-lg border text-3xl sm:text-4xl flex items-center justify-center transition-all duration-200 ${
              c.flipped || c.matched
                ? "bg-white/10 border-white/20"
                : "bg-gradient-to-br from-black/60 to-black/30 border-white/10 hover:border-neon-cyan/60"
            } ${c.matched ? "opacity-70" : ""}`}
          >
            {c.flipped || c.matched ? c.food : <span className="font-display text-neon-yellow/70">?</span>}
          </button>
        ))}
      </div>

      {done && (
        <div className="text-center mt-2 p-4 glass rounded-xl ring-1 ring-white/10">
          <div className="font-mono text-xs uppercase tracking-widest text-neon-yellow">Game Over</div>
          <div className="mt-1 font-display text-2xl neon-text-cyan">
            {winner === "Tie" ? "It's a tie!" : `${winner} wins!`}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {p1} {scores[0]} — {scores[1]} {p2}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button className="btn-neon" onClick={reset}>Rematch</button>
        <button className="btn-ghost-neon" onClick={onReset}>Change names</button>
      </div>
    </div>
  );
}
