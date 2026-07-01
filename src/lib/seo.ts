import type { GameMeta } from "./games";

export const SITE_URL = "https://arcadiax.lovable.app";
export const SITE_NAME = "ArcadiaX";
export const SITE_TAGLINE = "Play Legendary Retro Games Online";
export const DEFAULT_IMAGE =
  "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&w=1200&h=630&fit=crop";

export type SEOProps = {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "game";
  noindex?: boolean;
};

export function generateSEO(seo: SEOProps) {
  const fullTitle = seo.title.includes("ArcadiaX")
    ? seo.title
    : `${seo.title} — ArcadiaX`;
  const url = seo.canonical ? `${SITE_URL}${seo.canonical}` : SITE_URL;
  const image = seo.image || DEFAULT_IMAGE;

  const meta: Record<string, string>[] = [
    { title: fullTitle },
    { name: "description", content: seo.description },
    {
      name: "keywords",
      content:
        seo.keywords?.join(", ") ||
        "retro games, browser games, online games, free games, arcade games",
    },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: seo.description },
    { property: "og:type", content: seo.type || "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: seo.description },
    { name: "twitter:image", content: image },
  ];

  if (seo.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  return meta;
}

export function generateGameSEO(game: GameMeta) {
  const gameKeywords = [
    game.name.toLowerCase(),
    `${game.name} online`,
    `${game.name} free`,
    `${game.name} browser game`,
    "retro game",
    "arcade game",
    "play online",
    "free browser game",
    game.category.toLowerCase(),
    "no download",
    "no install",
  ];

  if (game.multiplayer) {
    gameKeywords.push("multiplayer game", "2 player game", "play with friends");
  }

  return generateSEO({
    title: `${game.name} — ArcadiaX`,
    description: `${game.tagline} Play ${game.name} instantly in your browser — free, no download, no install. ${game.category} game with ${game.difficulty.toLowerCase()} difficulty. ${game.players} player${game.players.includes("2") ? "s" : ""}.`,
    keywords: gameKeywords,
    canonical: `/games/${game.id}`,
    type: "game",
    image: `https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&w=1200&h=630&fit=crop&text=${encodeURIComponent(game.name)}`,
  });
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_TAGLINE,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/games?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description:
      "A neon-soaked browser arcade for legendary retro games. Play Tetris, Snake, Pong, 2048 and more — free, no install.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };
}

export function generateGameSchema(game: GameMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description: game.tagline,
    genre: game.category,
    gamePlatform: ["Web Browser", "Desktop", "Mobile"],
    applicationCategory: "Game",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
      bestRating: "5",
      worstRating: "1",
    },
    playMode: game.multiplayer ? ["SinglePlayer", "MultiPlayer"] : ["SinglePlayer"],
    gameServer: {
      "@type": "GameServer",
      name: "ArcadiaX",
      playersOnline: "100+",
    },
    url: `${SITE_URL}/games/${game.id}`,
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateItemListSchema(games: GameMeta[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ArcadiaX Games",
    numberOfItems: games.length,
    itemListElement: games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: game.name,
      url: `${SITE_URL}/games/${game.id}`,
    })),
  };
}

// Game specific descriptions for SEO
export const GAME_DESCRIPTIONS: Record<
  string,
  { howToPlay: string; rules: string; features: string[] }
> = {
  tetris: {
    howToPlay:
      "Use arrow keys to move and rotate falling tetrominos. Clear lines by filling them completely. The game speeds up as you progress.",
    rules:
      "Complete horizontal lines to clear them and score points. The game ends when blocks stack to the top. Longer line combos give higher scores.",
    features: [
      "Classic Tetris gameplay",
      "Progressive difficulty",
      "Score tracking",
      "Local high scores saved",
      "Mobile touch controls",
    ],
  },
  snake: {
    howToPlay:
      "Guide the snake using arrow keys or WASD. Eat food to grow longer. Avoid hitting walls or your own tail.",
    rules:
      "Each piece of food makes you longer. The game ends if you collide with walls or yourself. Higher scores mean longer snakes.",
    features: [
      "Classic Snake mechanics",
      "Responsive controls",
      "Score tracking",
      "Endless gameplay",
      "Mobile friendly",
    ],
  },
  pong: {
    howToPlay:
      "Move your paddle up or down to hit the ball. The AI opponent tries to return it. Score by getting the ball past the opponent.",
    rules:
      "First to reach a set score wins. If the ball passes your paddle, the opponent scores. Ball speed increases over time.",
    features: [
      "Classic Pong arcade",
      "AI opponent",
      "Score tracking",
      "Progressive difficulty",
      "Touch controls",
    ],
  },
  "2048": {
    howToPlay:
      "Use arrow keys to slide all tiles in one direction. Matching numbers merge into their sum. Combine tiles to reach 2048.",
    rules:
      "Tiles with the same value merge when they collide. Each move spawns a new tile (2 or 4). Game ends when no moves are possible.",
    features: [
      "Addictive puzzle gameplay",
      "Undo support",
      "Score tracking",
      "Local saves",
      "Touch swipe controls",
    ],
  },
  tictactoe: {
    howToPlay:
      "Click a cell to place your mark (X or O). Players alternate turns. First to get 3 in a row wins.",
    rules:
      "Three matching marks in a row (horizontal, vertical, or diagonal) wins. If all cells fill with no winner, it's a draw.",
    features: [
      "Classic Tic-Tac-Toe",
      "Local 2-player",
      "Simple controls",
      "Quick games",
      "Mobile friendly",
    ],
  },
  sudoku: {
    howToPlay:
      "Fill the 9x9 grid with digits 1-9. Each row, column, and 3x3 box must contain all digits 1-9 exactly once.",
    rules:
      "Numbers cannot repeat in any row, column, or 3x3 box. Use elimination and logic to solve. Mistakes reduce lives.",
    features: [
      "Multiple difficulty levels",
      "Hint system",
      "Note-taking mode",
      "Timer",
      "Auto-save",
    ],
  },
  memory: {
    howToPlay:
      "Click cards to flip them. Find matching pairs of food items. Take turns with another player or alone.",
    rules:
      "Players alternate turns. Match a pair to keep it and go again. The player with most pairs wins.",
    features: [
      "2-player local mode",
      "Food-themed cards",
      "Random layouts",
      "Score tracking",
      "Fun for all ages",
    ],
  },
  "snakes-ladders": {
    howToPlay:
      "Roll dice to move your piece. Land on a ladder to climb up. Land on a snake to slide down. First to 100 wins.",
    rules:
      "Roll exactly what you need to reach 100. Ladders boost you forward. Snakes send you backward. Two players take turns.",
    features: [
      "Classic board game",
      "2-10 player support",
      "Animated snakes & ladders",
      "Dice rolling animation",
      "Local multiplayer",
    ],
  },
  "chain-reaction": {
    howToPlay:
      "Click cells to place your color orbs. When a cell has too many orbs, it explodes into neighboring cells. Capture all cells to win.",
    rules:
      "Each cell has a limit based on position. Corner: 2, Edge: 3, Center: 4. Explosions cascade. Last player with cells wins.",
    features: [
      "Strategic gameplay",
      "2-player local or AI",
      "Cascade animations",
      "Board customization",
      "Addictive mechanics",
    ],
  },
};
