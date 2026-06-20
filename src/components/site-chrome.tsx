import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative h-9 w-9 rounded-md bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center font-display font-black text-background shadow-[0_0_18px_oklch(0.84_0.18_215/0.55)]">
            R
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-black tracking-widest neon-text-cyan">RETROVERSE</div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-[0.3em]">arcade</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-display text-xs uppercase tracking-widest">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
          <Link to="/games" className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Arcade</Link>
          <a href="#categories" className="text-muted-foreground hover:text-foreground transition-colors">Categories</a>
          <a href="#stats" className="text-muted-foreground hover:text-foreground transition-colors">Stats</a>
        </nav>
        <Link to="/games" className="btn-neon !py-2 !px-4 !text-xs">Play Now</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/10 glass">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 grid gap-8 md:grid-cols-3">
        <div>
          <div className="font-display text-xl font-black neon-text-cyan">RETROVERSE</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            A neon-soaked arcade for the games that made us. Built for the browser, tuned for 60fps.
          </p>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">Play</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/games" className="hover:text-neon-cyan">All games</Link></li>
            <li><Link to="/games/$gameId" params={{ gameId: "tetris" }} className="hover:text-neon-cyan">Tetris</Link></li>
            <li><Link to="/games/$gameId" params={{ gameId: "snake" }} className="hover:text-neon-cyan">Snake</Link></li>
            <li><Link to="/games/$gameId" params={{ gameId: "pong" }} className="hover:text-neon-cyan">Pong</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">Coming soon</div>
          <p className="text-sm text-muted-foreground">
            Online multiplayer, ranked ladders, friends, achievements, tournaments and 15+ more games.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-muted-foreground font-mono">
        © {new Date().getFullYear()} RetroVerse Arcade — INSERT COIN
      </div>
    </footer>
  );
}
