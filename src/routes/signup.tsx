import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — ArcadiaX" },
      {
        name: "description",
        content:
          "Join ArcadiaX for free. Create an account to track high scores, earn achievements, compete in multiplayer games, and save your progress across devices.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Join ArcadiaX — Free Account" },
      {
        property: "og:description",
        content: "Create your free arcade account and start playing classic retro games.",
      },
    ],
    links: [{ rel: "canonical", href: "https://arcadiax.lovable.app/signup" }],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sanitizeUsername = (raw: string): string => {
    return raw
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .trim()
      .slice(0, 20);
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
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
              ArcadiaX
            </div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">
              CREATE ACCOUNT
            </h1>
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
              <label
                htmlFor="username"
                className="block text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
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
              <label
                htmlFor="email"
                className="block text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
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
                placeholder="player@arcadiax.lovable.app"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
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
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
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

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-mono text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={() => signInWithGoogle()}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-900 font-mono text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>

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
