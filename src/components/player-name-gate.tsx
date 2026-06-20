import { useState, type ReactNode } from "react";
import { usePlayerName, sanitizePlayerName } from "@/hooks/usePlayerName";

interface Props {
  gameName: string;
  children: (playerName: string) => ReactNode;
}

export function PlayerNameGate({ gameName, children }: Props) {
  const { name, setName, loaded, maxLength } = usePlayerName();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (!loaded) {
    return <div className="aspect-video grid place-items-center text-neon-cyan font-mono">Loading…</div>;
  }

  if (!name || editing) {
    const clean = sanitizePlayerName(draft);
    const canSubmit = clean.length >= 2;
    return (
      <div className="aspect-video grid place-items-center p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            setName(clean);
            setDraft("");
            setEditing(false);
          }}
          className="w-full max-w-sm text-center"
        >
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-neon-yellow">
            Insert Coin
          </div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-black neon-text-cyan">
            Enter your player name
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Playing <span className="text-neon-magenta">{gameName}</span>. Your name is saved on this device.
          </p>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
            maxLength={maxLength}
            placeholder="PLAYER 1"
            aria-label="Player name"
            className="mt-5 w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 font-mono text-center text-lg tracking-widest uppercase text-neon-cyan placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan"
          />
          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
            2–{maxLength} chars · letters, numbers, space, _ -
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            {name && (
              <button
                type="button"
                className="btn-ghost-neon"
                onClick={() => { setEditing(false); setDraft(""); }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn-neon disabled:opacity-40" disabled={!canSubmit}>
              Start Game →
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Player:{" "}
          <span className="text-neon-cyan tracking-[0.2em]">{name}</span>
        </div>
        <button
          type="button"
          onClick={() => { setDraft(name); setEditing(true); }}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-neon-magenta"
        >
          Change name
        </button>
      </div>
      {children(name)}
    </div>
  );
}
