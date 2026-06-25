import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../hooks/useAuth";
import { generateWebsiteSchema, generateOrganizationSchema } from "../lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5",
      },
      { name: "theme-color", content: "#0A0A0F" },
      { name: "color-scheme", content: "dark" },
      { title: "RetroVerse Arcade — Play Legendary Retro Games Online" },
      {
        name: "description",
        content:
          "Play classic retro games online for free. Tetris, Snake, Pong, 2048, Sudoku, Tic-Tac-Toe, Memory Match, Snakes & Ladders, and Chain Reaction. No download, no install, instant play in browser.",
      },
      {
        name: "keywords",
        content:
          "retro games, browser games, online games, free games, arcade games, Tetris, Snake, Pong, 2048, Sudoku, multiplayer games, play online, no download, browser arcade",
      },
      { name: "author", content: "RetroVerse Arcade" },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow" },
      { property: "og:title", content: "RetroVerse Arcade — Play Legendary Retro Games Online" },
      {
        property: "og:description",
        content:
          "Play classic retro games online for free. Tetris, Snake, Pong, 2048, Sudoku and more. No download, no install, instant play in browser. A neon-soaked arcade experience.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://retroverse.arcade" },
      { property: "og:site_name", content: "RetroVerse Arcade" },
      { property: "og:locale", content: "en_US" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/10c94020-5a98-41fc-8eee-1a25c46f81d7",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "RetroVerse Arcade - Play Legendary Retro Games Online",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@retroversearc" },
      { name: "twitter:title", content: "RetroVerse Arcade — Play Legendary Retro Games Online" },
      {
        name: "twitter:description",
        content:
          "Play classic retro games online for free. Tetris, Snake, Pong, 2048 and more. No download required. Neon-soaked arcade experience.",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/10c94020-5a98-41fc-8eee-1a25c46f81d7",
      },
      {
        name: "twitter:image:alt",
        content: "RetroVerse Arcade - Play Legendary Retro Games Online",
      },
      { name: "format-detection", content: "telephone=no" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "RetroVerse" },
      { name: "application-name", content: "RetroVerse Arcade" },
      { name: "msapplication-TileColor", content: "#0A0A0F" },
      { name: "msapplication-config", content: "/browserconfig.xml" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "canonical", href: "https://retroverse.arcade" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap",
      },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(generateWebsiteSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(generateOrganizationSchema()),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
