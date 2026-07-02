import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { GameCard } from "@/components/game-card";
import { GAMES, CATEGORIES } from "@/lib/games";
import {
  generateSEO,
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateItemListSchema,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: generateSEO({
      title: "Nova Hub — Play. Connect. Compete.",
      description:
        "Nova Hub is a premium cosmic gaming platform. Play Tetris, Snake, Pong, 2048, Sudoku, Tic-Tac-Toe, Memory Match, Snakes & Ladders and Chain Reaction. Compete online in real-time multiplayer rooms.",
      keywords: [
        "Nova Hub",
        "online games",
        "browser games",
        "arcade games",
        "play Tetris online",
        "play Snake online",
        "free Pong game",
        "2048 online",
        "Sudoku free",
        "multiplayer games",
        "no download games",
        "instant play",
        "mobile games",
      ],
      canonical: "/",
      type: "website",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(generateWebsiteSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(generateOrganizationSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(generateItemListSchema(GAMES.filter((g) => g.available))),
      },
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
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-neon-magenta/30 blur-3xl animate-pulse-glow"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-neon-cyan/30 blur-3xl animate-pulse-glow"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20 md:py-32 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-neon-cyan">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
              Live · {GAMES.filter((g) => g.available).length} games online
            </div>
            <h1 className="mt-6 font-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05]">
              Welcome to <span className="neon-text-cyan">Nova</span>{" "}
              <span className="neon-text-magenta">Hub</span>
              <br />
              <span className="text-foreground/90">Play. Connect. Compete.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
              A premium cosmic gaming platform. Launch classic and modern titles instantly, jump into
              real-time multiplayer rooms, and climb the galactic leaderboards.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 sm:gap-4">
              <Link to="/games" className="btn-neon">
                ▶ Browse Games
              </Link>
              <Link to="/rooms" className="btn-ghost-neon">
                Join a Room
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <span>● 60 FPS</span>
              <span>● Cross-device saves</span>
              <span>● Real-time multiplayer</span>
            </div>
          </div>

          {/* Galaxy hero */}
          <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-sm md:max-w-md aspect-square animate-float-slow order-first md:order-none">
            <GalaxySphere />
          </div>
        </div>

        {/* Ticker */}
        <div className="relative border-y border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
          <div className="flex gap-12 py-4 animate-scroll-x whitespace-nowrap">
            {tickerGames.map((g, i) => (
              <span
                key={i}
                className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground"
              >
                <span className="text-neon-cyan">★</span> {g.name}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* FEATURED */}
      <section id="featured" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="Featured" title="Featured Games" />
        <div className="mt-8 sm:mt-10 grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="Browse" title="Explore the universe" />
        <div className="mt-8 sm:mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c}
              to="/games"
              className={`group glass rounded-xl p-6 transition-all hover:-translate-y-1 ring-1 ring-white/10 hover:ring-neon-cyan/50`}
            >
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                0{i + 1}
              </div>
              <div className="mt-2 font-display text-2xl font-bold group-hover:neon-text-cyan transition-colors">
                {c}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{categoryBlurb(c)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading kicker="By the numbers" title="Nova Hub in motion" />
        <div className="mt-8 sm:mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { v: String(GAMES.filter((g) => g.available).length), l: "Games live", c: "cyan" as const },
            { v: "15+", l: "Coming soon", c: "magenta" as const },
            { v: "60", l: "FPS target", c: "yellow" as const },
            { v: "∞", l: "High scores", c: "green" as const },
          ].map((s) => (

            <div key={s.l} className="glass rounded-xl p-4 sm:p-6 text-center ring-1 ring-white/10">
              <div
                className={`font-display text-4xl sm:text-5xl font-black ${
                  s.c === "cyan"
                    ? "neon-text-cyan"
                    : s.c === "magenta"
                      ? "neon-text-magenta"
                      : s.c === "yellow"
                        ? "text-neon-yellow"
                        : "text-neon-green"
                }`}
              >
                {s.v}
              </div>
              <div className="mt-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMING SOON BANNER */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-10">
        <div className="glass rounded-2xl p-8 ring-1 ring-neon-magenta/30 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />
          <div className="relative">
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-magenta">
              Roadmap
            </div>
            <h3 className="mt-3 font-display text-3xl md:text-4xl font-black">
              More games coming soon
            </h3>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Breakout, Space Invaders, Pac-Man, Asteroids, Chess, Minesweeper and 9 more titles are
              loading into the cabinet. Online multiplayer, achievements and ranked ladders are next
              on the queue.
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
    case "Arcade":
      return "Quarter-eaters and high-score chases.";
    case "Puzzle":
      return "Train your brain, one block at a time.";
    case "Strategy":
      return "Think four moves ahead.";
    case "Action":
      return "Reflex required.";
    case "Sports":
      return "Pixel athletics.";
    case "Multiplayer":
      return "Bring a friend (soon).";
    default:
      return "";
  }
}

function GalaxySphere() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full h-full drop-shadow-[0_0_60px_oklch(0.66_0.24_295/0.5)]"
    >
      <defs>
        <radialGradient id="galaxy-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="18%" stopColor="#e0f2fe" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#a855f7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="galaxy-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="galaxy-ring" x1="0" x2="1" y1="0.5" y2="0.5">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* soft nebula halo */}
      <circle cx="200" cy="200" r="190" fill="url(#galaxy-glow)" />

      {/* stars */}
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const r = 60 + ((i * 37) % 130);
        const x = 200 + Math.cos(angle) * r;
        const y = 200 + Math.sin(angle) * r * 0.9;
        const size = (i % 5) * 0.3 + 0.6;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={size}
            fill={i % 3 === 0 ? "#7dd3fc" : i % 3 === 1 ? "#c084fc" : "#ffffff"}
            opacity={0.5 + (i % 5) * 0.1}
          >
            <animate
              attributeName="opacity"
              values="0.3;0.9;0.3"
              dur={`${2 + (i % 4)}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}

      {/* orbital rings */}
      <ellipse
        cx="200"
        cy="200"
        rx="170"
        ry="55"
        fill="none"
        stroke="url(#galaxy-ring)"
        strokeWidth="1.5"
        transform="rotate(-22 200 200)"
        opacity="0.85"
      />
      <ellipse
        cx="200"
        cy="200"
        rx="160"
        ry="40"
        fill="none"
        stroke="url(#galaxy-ring)"
        strokeWidth="1"
        transform="rotate(24 200 200)"
        opacity="0.55"
      />
      <ellipse
        cx="200"
        cy="200"
        rx="180"
        ry="70"
        fill="none"
        stroke="url(#galaxy-ring)"
        strokeWidth="0.75"
        transform="rotate(6 200 200)"
        opacity="0.35"
      />

      {/* galaxy sphere core */}
      <circle cx="200" cy="200" r="110" fill="url(#galaxy-core)" />

      {/* moon accent */}
      <circle cx="320" cy="110" r="18" fill="#e5e7eb" opacity="0.9" />
      <circle cx="326" cy="106" r="14" fill="#0b0b1a" opacity="0.55" />

      {/* orbital dot */}
      <circle cx="60" cy="230" r="3" fill="#22d3ee">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="360" cy="260" r="2.5" fill="#ec4899">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

