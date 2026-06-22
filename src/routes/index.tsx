import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { GameCard } from "@/components/game-card";
import { GAMES, CATEGORIES } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RetroVerse Arcade — Play Legendary Retro Games Online" },
      { name: "description", content: "Tetris, Snake, Pong, 2048 and more retro classics — playable instantly in your browser, free, no install required." },
      { property: "og:title", content: "RetroVerse Arcade" },
      { property: "og:description", content: "A neon-soaked browser arcade for the games that made us." },
    ],
  }),
  component: HomePage,
});

const FEATURED = ["snakes-ladders", "tetris", "snake", "sudoku", "2048", "memory"];

function HomePage() {
  const featured = GAMES.filter((g) => FEATURED.includes(g.id));
  const tickerGames = [...GAMES, ...GAMES];

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 animate-grid-pan" aria-hidden />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-neon-magenta/30 blur-3xl animate-pulse-glow" aria-hidden />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-neon-cyan/30 blur-3xl animate-pulse-glow" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20 md:py-32 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-neon-cyan">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
              Now playing · 7 games live
            </div>
            <h1 className="mt-6 font-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05]">
              Play <span className="neon-text-cyan">Legendary</span><br />
              Retro Games <span className="neon-text-magenta">Online</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
              A neon-soaked arcade for the classics. Drop a quarter, no quarter required —
              just open and play. Progress saves automatically.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 sm:gap-4">
              <Link to="/games" className="btn-neon">▶ Play Now</Link>
              <a href="#featured" className="btn-ghost-neon">Browse Games</a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <span>● 60 FPS</span><span>● Offline saves</span><span>● Mobile ready</span>
            </div>
          </div>

          {/* Arcade cabinet */}
          <div className="relative mx-auto w-full max-w-[18rem] sm:max-w-sm md:max-w-md aspect-[3/4] animate-float-slow order-first md:order-none">
            <ArcadeCabinet />
          </div>
        </div>

        {/* Ticker */}
        <div className="relative border-y border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
          <div className="flex gap-12 py-4 animate-scroll-x whitespace-nowrap">
            {tickerGames.map((g, i) => (
              <span key={i} className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
                <span className="text-neon-cyan">★</span> {g.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section id="featured" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="Featured" title="Tonight's hot tables" />
        <div className="mt-8 sm:mt-10 grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="Browse" title="Pick your poison" />
        <div className="mt-8 sm:mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <Link key={c} to="/games" className={`group glass rounded-xl p-6 transition-all hover:-translate-y-1 ring-1 ring-white/10 hover:ring-neon-cyan/50`}>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">0{i + 1}</div>
              <div className="mt-2 font-display text-2xl font-bold group-hover:neon-text-cyan transition-colors">{c}</div>
              <div className="mt-1 text-sm text-muted-foreground">{categoryBlurb(c)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="By the numbers" title="The arcade in motion" />
        <div className="mt-8 sm:mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { v: "7", l: "Games live", c: "cyan" as const },
            { v: "15+", l: "Coming soon", c: "magenta" as const },
            { v: "60", l: "FPS target", c: "yellow" as const },
            { v: "∞", l: "High scores", c: "green" as const },
          ].map((s) => (
            <div key={s.l} className="glass rounded-xl p-4 sm:p-6 text-center ring-1 ring-white/10">
              <div className={`font-display text-4xl sm:text-5xl font-black ${
                s.c === "cyan" ? "neon-text-cyan" : s.c === "magenta" ? "neon-text-magenta" : s.c === "yellow" ? "text-neon-yellow" : "text-neon-green"
              }`}>{s.v}</div>
              <div className="mt-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMING SOON BANNER */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-10">
        <div className="glass rounded-2xl p-8 ring-1 ring-neon-magenta/30 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />
          <div className="relative">
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-magenta">Roadmap</div>
            <h3 className="mt-3 font-display text-3xl md:text-4xl font-black">More games coming soon</h3>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Breakout, Space Invaders, Pac-Man, Asteroids, Chess, Minesweeper and 9 more
              titles are loading into the cabinet. Online multiplayer, achievements and
              ranked ladders are next on the queue.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-cyan">{kicker}</div>
      <h2 className="mt-2 font-display text-3xl md:text-4xl font-black">{title}</h2>
    </div>
  );
}

function categoryBlurb(c: string) {
  switch (c) {
    case "Arcade": return "Quarter-eaters and high-score chases.";
    case "Puzzle": return "Train your brain, one block at a time.";
    case "Strategy": return "Think four moves ahead.";
    case "Action": return "Reflex required.";
    case "Sports": return "Pixel athletics.";
    case "Multiplayer": return "Bring a friend (soon).";
    default: return "";
  }
}

function ArcadeCabinet() {
  return (
    <svg viewBox="0 0 300 400" className="w-full h-full drop-shadow-[0_0_40px_oklch(0.84_0.18_215/0.4)]">
      <defs>
        <linearGradient id="cab" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a1030"/>
          <stop offset="100%" stopColor="#0a0a0f"/>
        </linearGradient>
        <linearGradient id="screen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#FF00AA" stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      {/* body */}
      <path d="M30 20 Q30 0 50 0 L250 0 Q270 0 270 20 L290 380 Q290 400 270 400 L30 400 Q10 400 10 380 Z" fill="url(#cab)" stroke="#00F5FF" strokeWidth="2"/>
      {/* marquee */}
      <rect x="40" y="15" width="220" height="40" rx="6" fill="#0a0a0f" stroke="#FF00AA" strokeWidth="1.5"/>
      <text x="150" y="42" textAnchor="middle" fill="#FF00AA" fontFamily="Orbitron, sans-serif" fontWeight="900" fontSize="18" style={{ filter: "drop-shadow(0 0 6px #FF00AA)" }}>RETROVERSE</text>
      {/* screen */}
      <rect x="45" y="70" width="210" height="160" rx="8" fill="#0a0a0f" stroke="#00F5FF" strokeWidth="2"/>
      <rect x="55" y="80" width="190" height="140" rx="4" fill="url(#screen)" opacity="0.25"/>
      {/* pixel art on screen */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={70 + (i % 5) * 30} y={120 + Math.floor(i / 5) * 30} width="20" height="20" fill={i % 2 ? "#00F5FF" : "#FFE600"} opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2 + i * 0.2}s`} repeatCount="indefinite"/>
        </rect>
      ))}
      {/* control panel */}
      <rect x="35" y="245" width="230" height="80" rx="6" fill="#15101e" stroke="#00F5FF" strokeWidth="1.5"/>
      <circle cx="80" cy="285" r="18" fill="#FF00AA" style={{ filter: "drop-shadow(0 0 8px #FF00AA)" }}/>
      <circle cx="80" cy="285" r="8" fill="#0a0a0f"/>
      <circle cx="170" cy="278" r="10" fill="#FFE600" style={{ filter: "drop-shadow(0 0 6px #FFE600)" }}/>
      <circle cx="200" cy="290" r="10" fill="#00F5FF" style={{ filter: "drop-shadow(0 0 6px #00F5FF)" }}/>
      <circle cx="230" cy="278" r="10" fill="#FF00AA" style={{ filter: "drop-shadow(0 0 6px #FF00AA)" }}/>
      {/* base */}
      <rect x="20" y="340" width="260" height="40" rx="4" fill="#0a0a0f" stroke="#FF00AA" strokeWidth="1.5"/>
      <text x="150" y="367" textAnchor="middle" fill="#FFE600" fontFamily="Orbitron" fontWeight="900" fontSize="12">INSERT COIN</text>
    </svg>
  );
}
