import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getGame } from "@/lib/games";
import { lazy, Suspense } from "react";
import { PlayerNameGate } from "@/components/player-name-gate";
import { generateGameSEO, generateGameSchema, generateBreadcrumbSchema, GAME_DESCRIPTIONS } from "@/lib/seo";

const TetrisGame = lazy(() => import("@/games/tetris"));
const SnakeGame = lazy(() => import("@/games/snake"));
const PongGame = lazy(() => import("@/games/pong"));
const Game2048 = lazy(() => import("@/games/g2048"));
const TicTacToe = lazy(() => import("@/games/tictactoe"));
const MemoryGame = lazy(() => import("@/games/memory"));
const SudokuGame = lazy(() => import("@/games/sudoku"));
const SnakesAndLadders = lazy(() => import("@/games/snakes-and-ladders"));
const ChainReactionGame = lazy(() => import("@/games/chain-reaction"));

export const Route = createFileRoute("/games/$gameId")({
  head: ({ params }) => {
    const g = getGame(params.gameId);
    if (!g) {
      return {
        meta: [
          { title: "Game Not Found — RetroVerse Arcade" },
          { name: "description", content: "This game is not available yet. Browse other retro games at RetroVerse Arcade." },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    const seoData = generateGameSEO(g);
    const gameSchema = generateGameSchema(g);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Games", url: "/games" },
      { name: g.name, url: `/games/${g.id}` },
    ]);

    return {
      meta: seoData,
      links: [
        { rel: "canonical", href: `https://retroverse.arcade/games/${g.id}` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(gameSchema),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbSchema),
        },
      ],
    };
  },
  loader: ({ params }) => {
    const g = getGame(params.gameId);
    if (!g) throw notFound();
    return g;
  },
  notFoundComponent: GameNotFound,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h2 className="font-display text-2xl text-neon-magenta">Cabinet malfunction</h2>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        <button className="btn-ghost-neon mt-4" onClick={reset}>Retry</button>
      </div>
    </div>
  ),
  component: GameRoute,
});

function GameNotFound() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-6 text-center">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">Coming Soon</div>
          <h1 className="mt-3 font-display text-4xl font-black neon-text-magenta">Cabinet not installed yet</h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            This game is on the roadmap but not playable yet. Check the arcade for what's live tonight.
          </p>
          <Link to="/games" className="btn-neon mt-6 inline-flex">← Back to arcade</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function GameRoute() {
  const game = Route.useLoaderData()!;
  const gameInfo = GAME_DESCRIPTIONS[game.id];



  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Breadcrumb */}
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center text-xs text-muted-foreground">
            <li><Link to="/" className="hover:text-neon-cyan transition-colors">Home</Link></li>
            <li className="mx-2">/</li>
            <li><Link to="/games" className="hover:text-neon-cyan transition-colors">Games</Link></li>
            <li className="mx-2">/</li>
            <li className="text-foreground font-medium">{game.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black neon-text-cyan truncate">{game.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{game.tagline}</p>
          </div>
          <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground text-right shrink-0">
            {game.category}<br className="sm:hidden" /><span className="hidden sm:inline"> · </span>{game.difficulty}<span className="sm:inline"> · </span>{game.players}
          </div>
        </div>

        {/* Game Container */}
        <div className="glass rounded-2xl p-3 sm:p-4 md:p-6 ring-1 ring-white/10 overflow-hidden">
          {!game.available ? (
            <ComingSoon />
          ) : game.id === "memory" ? (
            <Suspense fallback={<div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading cabinet…</div>}>
              <MemoryGame />
            </Suspense>
          ) : game.id === "snakes-ladders" ? (
            <Suspense fallback={<div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading cabinet…</div>}>
              <SnakesAndLadders />
            </Suspense>
          ) : game.id === "chain-reaction" ? (
            <Suspense fallback={<div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading cabinet…</div>}>
              <ChainReactionGame />
            </Suspense>
          ) : (
            <PlayerNameGate gameName={game.name}>
              {() => (
                <Suspense fallback={<div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading cabinet…</div>}>
                  {game.id === "tetris" && <TetrisGame />}
                  {game.id === "snake" && <SnakeGame />}
                  {game.id === "pong" && <PongGame />}
                  {game.id === "2048" && <Game2048 />}
                  {game.id === "tictactoe" && <TicTacToe />}
                  {game.id === "sudoku" && <SudokuGame />}
                </Suspense>
              )}
            </PlayerNameGate>
          )}
        </div>

        {/* Game Info Section - SEO Content */}
        {game.available && gameInfo && (
          <section className="mt-8 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">How to Play {game.name}</h2>
              <p className="text-muted-foreground leading-relaxed">{gameInfo.howToPlay}</p>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">Rules</h2>
              <p className="text-muted-foreground leading-relaxed">{gameInfo.rules}</p>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">Features</h2>
              <ul className="space-y-2">
                {gameInfo.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-neon-cyan">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* SEO Keywords Section */}
            <div className="glass rounded-xl p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">About {game.name}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {game.name} is a classic {game.category.toLowerCase()} game you can play online for free at RetroVerse Arcade.
                {game.multiplayer ? "Challenge your friends in local multiplayer mode." : "Challenge yourself and track your high scores."}
                No download required - play instantly in your browser on desktop, tablet, or mobile.
                Our version features smooth 60 FPS gameplay, responsive controls, and saves your progress automatically.
              </p>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="aspect-video grid place-items-center text-center p-6">
      <div>
        <div className="font-display text-2xl text-neon-yellow">Coming soon</div>
        <p className="text-muted-foreground mt-2">This cabinet is being wired up. More games are being added — stay tuned.</p>
      </div>
    </div>
  );
}
