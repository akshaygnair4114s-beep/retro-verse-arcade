import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — RetroVerse Arcade" },
      { name: "description", content: "Join RetroVerse Arcade for free. Create an account to track high scores, earn achievements, compete in multiplayer games, and save your progress across devices." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Join RetroVerse Arcade — Free Account" },
      { property: "og:description", content: "Create your free arcade account and start playing classic retro games." },
    ],
    links: [
      { rel: "canonical", href: "https://retroverse.arcade/signup" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sanitizeUsername = (raw: string): string => {
    return raw.replace(/[^a-zA-Z0-9_-]/g, "").trim().slice(0, 20);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = sanitizeUsername(username);
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    const result = await signUp(email, password, cleanUsername);
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
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">RetroVerse</div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">CREATE ACCOUNT</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Join the arcade. Track your scores, earn achievements, and prepare for multiplayer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta text-sm font-mono">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting || loading}
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors disabled:opacity-50"
                placeholder="ArcadeKing"
              />
              <p className="text-[10px] text-muted-foreground">
                3-20 characters. Letters, numbers, underscores, and hyphens only.
              </p>
            </div>

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
              <p className="text-[10px] text-muted-foreground">At least 6 characters</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting || loading}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors disabled:opacity-50"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-neon-cyan hover:underline font-mono">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
