import { Link } from "@tanstack/react-router";
import type { GameMeta } from "@/lib/games";

const accentMap: Record<GameMeta["accent"], { ring: string; glow: string; text: string }> = {
  cyan: {
    ring: "ring-neon-cyan/40",
    glow: "shadow-[0_0_30px_oklch(0.84_0.18_215/0.35)]",
    text: "text-neon-cyan",
  },
  magenta: {
    ring: "ring-neon-magenta/40",
    glow: "shadow-[0_0_30px_oklch(0.7_0.28_348/0.35)]",
    text: "text-neon-magenta",
  },
  yellow: {
    ring: "ring-neon-yellow/40",
    glow: "shadow-[0_0_30px_oklch(0.92_0.18_100/0.35)]",
    text: "text-neon-yellow",
  },
  green: {
    ring: "ring-neon-green/40",
    glow: "shadow-[0_0_30px_oklch(0.85_0.22_145/0.35)]",
    text: "text-neon-green",
  },
  purple: {
    ring: "ring-neon-purple/40",
    glow: "shadow-[0_0_30px_oklch(0.65_0.24_300/0.35)]",
    text: "text-neon-purple",
  },
};

export function GameCard({ game }: { game: GameMeta }) {
  const a = accentMap[game.accent];
  const inner = (
    <div
      className={`group relative h-full overflow-hidden rounded-xl glass ring-1 ${a.ring} transition-all duration-300 hover:-translate-y-1 hover:${a.glow}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 group-hover:animate-grid-pan" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/60" />
        <div className="absolute inset-0 grid place-items-center text-7xl drop-shadow-[0_0_18px_currentColor] transition-transform duration-500 group-hover:scale-110">
          <span className={a.text}>{game.emoji}</span>
        </div>
        {!game.available && (
          <div className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-display uppercase tracking-widest text-neon-yellow border border-neon-yellow/40">
            Soon
          </div>
        )}
        {game.multiplayer && (
          <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-display uppercase tracking-widest text-neon-magenta border border-neon-magenta/40">
            MP
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-display text-lg font-bold ${a.text}`}>{game.name}</h3>
          <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
            {game.category}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{game.tagline}</p>
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>{game.players}</span>
          <span>{game.difficulty}</span>
        </div>
      </div>
    </div>
  );

  if (!game.available) {
    return <div className="opacity-70 cursor-not-allowed">{inner}</div>;
  }
  return (
    <Link to="/games/$gameId" params={{ gameId: game.id }} className="block h-full">
      {inner}
    </Link>
  );
}
