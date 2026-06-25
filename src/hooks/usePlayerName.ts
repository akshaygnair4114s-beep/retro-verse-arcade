import { useCallback, useEffect, useState } from "react";

const KEY = "retroverse:player-name";
const MAX_LEN = 16;

export function sanitizePlayerName(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, MAX_LEN);
}

export function usePlayerName() {
  const [name, setNameState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(KEY);
    if (raw) setNameState(raw);
    setLoaded(true);
  }, []);

  const setName = useCallback((next: string) => {
    const clean = sanitizePlayerName(next);
    setNameState(clean);
    if (typeof window !== "undefined") {
      if (clean) window.localStorage.setItem(KEY, clean);
      else window.localStorage.removeItem(KEY);
    }
  }, []);

  const clear = useCallback(() => setName(""), [setName]);

  return { name, setName, clear, loaded, maxLength: MAX_LEN };
}
