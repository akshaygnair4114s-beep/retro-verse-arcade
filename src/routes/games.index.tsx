import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { GameCard } from "@/components/game-card";
import { GAMES, CATEGORIES, type GameCategory } from "@/lib/games";
import { generateSEO, generateItemListSchema, generateBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: generateSEO({
      title: "Games — RetroVerse Arcade",
      description: "Browse and play all free retro games at RetroVerse Arcade. Tetris, Snake, Pong, 2048, Sudoku, Tic-Tac-Toe, Memory Match, Snakes & Ladders, Chain Reaction and more. No download, no install, instant play.",
      keywords: ["free online games", "retro games", "browser games", "arcade games", "play Tetris online", "play Snake online", "free Sudoku", "no download games", "instant play games"],
      canonical: "/games",
      type: "website",
    }),
    links: [
      { rel: "canonical", href: "https://retroverse.arcade/games" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Games", url: "/games" },
        ])),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(generateItemListSchema(GAMES)),
      },
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
        {/* Breadcrumb */}
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center text-xs text-muted-foreground">
            <li><a href="/" className="hover:text-neon-cyan transition-colors">Home</a></li>
            <li className="mx-2">/</li>
            <li className="text-foreground font-medium">Games</li>
          </ol>
        </nav>

        <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-cyan">Arcade</div>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-black">Play Free Retro Games Online</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Browse 9+ free retro games you can play instantly in your browser. No download, no install required.
          Tetris, Snake, Pong, 2048, Sudoku, Memory Match, Snakes & Ladders, and more. Progress and high scores save automatically.
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
