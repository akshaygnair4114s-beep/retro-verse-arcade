import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { GameCard } from "@/components/game-card";
import { GAMES, CATEGORIES, type GameCategory } from "@/lib/games";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Arcade — RetroVerse" },
      { name: "description", content: "Browse every game in the RetroVerse arcade. Tetris, Snake, Pong, 2048 and more." },
      { property: "og:title", content: "RetroVerse Arcade — All Games" },
      { property: "og:description", content: "The full lineup. Pick a cabinet and play." },
    ],
  }),
  component: GamesIndex,
});

function GamesIndex() {
  const [filter, setFilter] = useState<GameCategory | "All">("All");
  const visible = filter === "All" ? GAMES : GAMES.filter((g) => g.category === filter || (filter === "Multiplayer" && g.multiplayer));

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-12 flex-1">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-cyan">Arcade</div>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-black">The full lineup</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          5 games live, 15+ on the way. Pick a cabinet and play — progress and high scores save automatically.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-display uppercase tracking-widest transition-all ${
                filter === c
                  ? "bg-gradient-to-r from-neon-cyan to-neon-magenta text-background shadow-[0_0_18px_oklch(0.84_0.18_215/0.5)]"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
