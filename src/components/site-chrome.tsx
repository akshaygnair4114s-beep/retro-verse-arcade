import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    close();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" onClick={close} className="flex items-center gap-3 group min-w-0">
          <NovaLogo className="h-10 w-10 shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-display text-base sm:text-lg font-black tracking-[0.18em] neon-text-cyan truncate">
              NOVA HUB
            </div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-[0.3em]">
              Play · Connect · Compete
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-display text-xs uppercase tracking-widest">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/games"
            className="text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Games
          </Link>
          <Link
            to="/rooms"
            className="text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Rooms
          </Link>
          {user && (
            <Link
              to="/profile"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              Profile
            </Link>
          )}
        </nav>


        <div className="flex items-center gap-2">
          {!loading &&
            (user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/15 hover:border-neon-cyan/50 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta grid place-items-center text-xs font-display font-black text-background">
                      {profile?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="font-mono text-xs text-foreground max-w-[80px] truncate">
                    {profile?.username}
                  </span>
                </Link>
                <button onClick={handleSignOut} className="btn-ghost-neon !py-2 !px-3 !text-[11px]">
                  Log Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost-neon !py-2 !px-3 !text-[11px]">
                  Log In
                </Link>
                <Link to="/signup" className="btn-neon !py-2 !px-3 !text-[11px]">
                  Sign Up
                </Link>
              </div>
            ))}
          <Link to="/games" className="btn-neon !py-2 !px-3 !text-[11px] sm:hidden">
            Play
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid place-items-center h-11 w-11 rounded-md border border-white/15 bg-black/30 text-neon-cyan"
          >
            <span className="sr-only">Menu</span>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
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
            <li>
              <Link to="/" onClick={close} className="block py-3 px-2 rounded-md hover:bg-white/5">
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/games"
                onClick={close}
                className="block py-3 px-2 rounded-md hover:bg-white/5"
              >
                Arcade
              </Link>
            </li>
            <li>
              <a
                href="/#categories"
                onClick={close}
                className="block py-3 px-2 rounded-md hover:bg-white/5"
              >
                Categories
              </a>
            </li>
            <li>
              <a
                href="/#stats"
                onClick={close}
                className="block py-3 px-2 rounded-md hover:bg-white/5"
              >
                Stats
              </a>
            </li>
            {user && (
              <>
                <li>
                  <Link
                    to="/rooms"
                    onClick={close}
                    className="block py-3 px-2 rounded-md hover:bg-white/5"
                  >
                    Game Rooms
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile"
                    onClick={close}
                    className="block py-3 px-2 rounded-md hover:bg-white/5"
                  >
                    Profile
                  </Link>
                </li>
              </>
            )}
            <li className="pt-2">
              {!loading && user ? (
                <div className="grid gap-2">
                  <Link to="/games" onClick={close} className="btn-neon w-full text-center">
                    Play Now
                  </Link>
                  <button onClick={handleSignOut} className="btn-ghost-neon w-full text-center">
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link to="/signup" onClick={close} className="btn-neon w-full text-center">
                    Sign Up
                  </Link>
                  <Link to="/login" onClick={close} className="btn-ghost-neon w-full text-center">
                    Log In
                  </Link>
                </div>
              )}
            </li>
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
          <div className="font-display text-xl font-black neon-text-cyan">ARCADIAX</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            A neon-soaked arcade for the games that made us. Built for the browser, tuned for 60fps.
          </p>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Play
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/games" className="hover:text-neon-cyan">
                All games
              </Link>
            </li>
            <li>
              <Link
                to="/games/$gameId"
                params={{ gameId: "tetris" }}
                className="hover:text-neon-cyan"
              >
                Tetris
              </Link>
            </li>
            <li>
              <Link
                to="/games/$gameId"
                params={{ gameId: "snake" }}
                className="hover:text-neon-cyan"
              >
                Snake
              </Link>
            </li>
            <li>
              <Link
                to="/games/$gameId"
                params={{ gameId: "pong" }}
                className="hover:text-neon-cyan"
              >
                Pong
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Now Live
          </div>
          <p className="text-sm text-muted-foreground">
            Online multiplayer rooms, Google sign-in, ranked ladders, friends, achievements,
            tournaments and 15+ more games.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 px-4 text-center text-xs text-muted-foreground font-mono">
        © {new Date().getFullYear()} ArcadiaX — INSERT COIN
      </div>
    </footer>
  );
}
