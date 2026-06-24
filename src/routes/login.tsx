import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — RetroVerse Arcade" },
      { name: "description", content: "Log in to your RetroVerse Arcade account to track high scores, achievements, and play with friends." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Log In — RetroVerse Arcade" },
      { property: "og:description", content: "Access your arcade profile and continue your gaming journey." },
    ],
    links: [
      { rel: "canonical", href: "https://retroverse.arcade/login" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate({ to: "/profile" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-cyan">RetroVerse</div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-magenta">LOG IN</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome back, player. Ready to continue your arcade journey?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta text-sm font-mono">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting || loading}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors disabled:opacity-50"
                placeholder="player@retroverse.arcade"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting || loading}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors disabled:opacity-50"
                placeholder="********"
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-mono text-neon-cyan hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              New to the arcade?{" "}
              <Link to="/signup" className="text-neon-cyan hover:underline font-mono">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
