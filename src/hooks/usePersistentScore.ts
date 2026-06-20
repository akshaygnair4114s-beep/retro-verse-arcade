import { useCallback, useEffect, useState } from "react";

export function usePersistentScore(gameId: string, initial = 0) {
  const key = `retroverse:highscore:${gameId}`;
  const [highScore, setHighScore] = useState<number>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key);
    if (raw) setHighScore(parseInt(raw, 10) || 0);
  }, [key]);

  const submit = useCallback(
    (score: number) => {
      setHighScore((prev) => {
        const next = Math.max(prev, score);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, String(next));
        }
        return next;
      });
    },
    [key],
  );

  return { highScore, submit };
}

export function usePersistentState<T>(key: string, initial: T) {
  const fullKey = `retroverse:state:${key}`;
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(fullKey);
    if (raw) {
      try { setValue(JSON.parse(raw) as T); } catch { /* noop */ }
    }
    setLoaded(true);
  }, [fullKey]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    window.localStorage.setItem(fullKey, JSON.stringify(value));
  }, [fullKey, value, loaded]);

  return [value, setValue, loaded] as const;
}
