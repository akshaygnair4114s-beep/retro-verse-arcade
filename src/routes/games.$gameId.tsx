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
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 flex-1">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <Link to="/games" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-neon-cyan">← Arcade</Link>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-black neon-text-cyan">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{game.tagline}</p>
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {game.category} · {game.difficulty} · {game.players}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 md:p-6 ring-1 ring-white/10">
          {!game.available ? (
            <ComingSoon />
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
