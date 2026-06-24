import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — RetroVerse Arcade" },
      { name: "description", content: "Reset your RetroVerse Arcade password. Enter your email to receive a password reset link." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://retroverse.arcade/forgot-password" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await resetPassword(email);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">RetroVerse</div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">RESET PASSWORD</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="glass rounded-xl p-6 text-center">
              <div className="text-neon-green text-4xl mb-4">✓</div>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="text-neon-cyan">{email}</span>.
                Click the link in the email to reset your password.
              </p>
              <div className="mt-6">
                <Link to="/login" className="btn-ghost-neon">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
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
                  disabled={submitting}
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors disabled:opacity-50"
                  placeholder="player@retroverse.arcade"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-xs font-mono text-neon-cyan hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
