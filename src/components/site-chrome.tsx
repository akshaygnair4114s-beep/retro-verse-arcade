import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" onClick={close} className="flex items-center gap-2 group min-w-0">
          <div className="relative h-9 w-9 shrink-0 rounded-md bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center font-display font-black text-background shadow-[0_0_18px_oklch(0.84_0.18_215/0.55)]">
            R
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-display text-base sm:text-lg font-black tracking-widest neon-text-cyan truncate">RETROVERSE</div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-[0.3em]">arcade</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-display text-xs uppercase tracking-widest">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
          <Link to="/games" className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Arcade</Link>
          <a href="/#categories" className="text-muted-foreground hover:text-foreground transition-colors">Categories</a>
          <a href="/#stats" className="text-muted-foreground hover:text-foreground transition-colors">Stats</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/games" className="btn-neon !py-2 !px-3 !text-[11px] hidden sm:inline-flex">Play Now</Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid place-items-center h-11 w-11 rounded-md border border-white/15 bg-black/30 text-neon-cyan"
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-white/10 bg-black/70 backdrop-blur-xl">
          <ul className="mx-auto max-w-7xl px-4 py-3 grid gap-1 font-display text-sm uppercase tracking-widest">
            <li><Link to="/" onClick={close} className="block py-3 px-2 rounded-md hover:bg-white/5">Home</Link></li>
            <li><Link to="/games" onClick={close} className="block py-3 px-2 rounded-md hover:bg-white/5">Arcade</Link></li>
            <li><a href="/#categories" onClick={close} className="block py-3 px-2 rounded-md hover:bg-white/5">Categories</a></li>
            <li><a href="/#stats" onClick={close} className="block py-3 px-2 rounded-md hover:bg-white/5">Stats</a></li>
            <li className="pt-2"><Link to="/games" onClick={close} className="btn-neon w-full">Play Now</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 sm:mt-24 border-t border-white/10 glass">
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
      <div className="border-t border-white/5 py-4 px-4 text-center text-xs text-muted-foreground font-mono">
        © {new Date().getFullYear()} RetroVerse Arcade — INSERT COIN
      </div>
    </footer>
  );
}
