import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getGame } from "@/lib/games";
import { lazy, Suspense } from "react";
import { PlayerNameGate } from "@/components/player-name-gate";

const TetrisGame = lazy(() => import("@/games/tetris"));
const SnakeGame = lazy(() => import("@/games/snake"));
const PongGame = lazy(() => import("@/games/pong"));
const Game2048 = lazy(() => import("@/games/g2048"));
const TicTacToe = lazy(() => import("@/games/tictactoe"));
const MemoryGame = lazy(() => import("@/games/memory"));

export const Route = createFileRoute("/games/$gameId")({
  head: ({ params }) => {
    const g = getGame(params.gameId);
    const title = g ? `${g.name} — RetroVerse Arcade` : "Game — RetroVerse";
    return {
      meta: [
        { title },
        { name: "description", content: g?.tagline ?? "Play retro games online." },
        { property: "og:title", content: title },
        { property: "og:description", content: g?.tagline ?? "" },
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
  const game = Route.useLoaderData();

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 sm:py-8 flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="min-w-0">
            <Link to="/games" className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground hover:text-neon-cyan">← Arcade</Link>
            <h1 className="mt-1 sm:mt-2 font-display text-2xl sm:text-3xl md:text-4xl font-black neon-text-cyan truncate">{game.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{game.tagline}</p>
          </div>
          <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground text-right shrink-0">
            {game.category}<br className="sm:hidden" /><span className="hidden sm:inline"> · </span>{game.difficulty}<span className="sm:inline"> · </span>{game.players}
          </div>
        </div>

        <div className="glass rounded-2xl p-3 sm:p-4 md:p-6 ring-1 ring-white/10 overflow-hidden">
          {!game.available ? (
            <ComingSoon />
          ) : game.id === "memory" ? (
            <Suspense fallback={<div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading cabinet…</div>}>
              <MemoryGame />
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
                </Suspense>
              )}
            </PlayerNameGate>
          )}
        </div>
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
