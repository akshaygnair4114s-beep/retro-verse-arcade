
-- ============================================================
-- 1) match_history: server-side validation trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_match_history_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Caller must be the player recording the result.
  IF NEW.player_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'player_id must match the authenticated user';
  END IF;

  -- Result must be one of the allowed values.
  IF NEW.result NOT IN ('win', 'loss', 'draw') THEN
    RAISE EXCEPTION 'result must be win, loss, or draw';
  END IF;

  -- Score and duration must be within sane bounds.
  IF NEW.score < 0 OR NEW.score > 1000000 THEN
    RAISE EXCEPTION 'score out of allowed range';
  END IF;
  IF NEW.duration_seconds < 0 OR NEW.duration_seconds > 86400 THEN
    RAISE EXCEPTION 'duration_seconds out of allowed range';
  END IF;

  -- game_type must be non-empty and reasonable length.
  IF NEW.game_type IS NULL OR length(NEW.game_type) = 0 OR length(NEW.game_type) > 64 THEN
    RAISE EXCEPTION 'game_type must be 1-64 characters';
  END IF;

  -- Cannot record a match against yourself.
  IF NEW.opponent_id IS NOT NULL AND NEW.opponent_id = NEW.player_id THEN
    RAISE EXCEPTION 'opponent_id cannot equal player_id';
  END IF;

  -- If a room is referenced, both parties must have actually joined it.
  IF NEW.room_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_id = NEW.room_id AND user_id = NEW.player_id
    ) THEN
      RAISE EXCEPTION 'player did not join this room';
    END IF;

    IF NEW.opponent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_id = NEW.room_id AND user_id = NEW.opponent_id
    ) THEN
      RAISE EXCEPTION 'opponent did not join this room';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_history_validate_insert ON public.match_history;
CREATE TRIGGER match_history_validate_insert
BEFORE INSERT ON public.match_history
FOR EACH ROW EXECUTE FUNCTION public.validate_match_history_insert();

-- Prevent recording the same room-match twice per player.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_history_room_player_unique'
  ) THEN
    ALTER TABLE public.match_history
      ADD CONSTRAINT match_history_room_player_unique UNIQUE (room_id, player_id);
  END IF;
END $$;

-- Match history is a factual ledger; block updates and deletes from clients.
DROP POLICY IF EXISTS "No client updates to match history" ON public.match_history;
CREATE POLICY "No client updates to match history"
  ON public.match_history
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes of match history" ON public.match_history;
CREATE POLICY "No client deletes of match history"
  ON public.match_history
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================
-- 2) profiles.avatar_url: allow-list of trusted hosts
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_avatar_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  url text := NEW.avatar_url;
  host text;
BEGIN
  IF url IS NULL OR length(url) = 0 THEN
    NEW.avatar_url := NULL;
    RETURN NEW;
  END IF;

  IF length(url) > 2048 THEN
    RAISE EXCEPTION 'avatar_url is too long';
  END IF;

  -- Must be https://
  IF url !~* '^https://' THEN
    RAISE EXCEPTION 'avatar_url must use https';
  END IF;

  -- Extract lowercase hostname (portion between "https://" and the next "/" or "?" or "#").
  host := lower(split_part(regexp_replace(url, '^https://', ''), '/', 1));
  host := split_part(host, '?', 1);
  host := split_part(host, '#', 1);
  host := split_part(host, ':', 1); -- strip port

  IF host IS NULL OR length(host) = 0 THEN
    RAISE EXCEPTION 'avatar_url has no host';
  END IF;

  -- Trusted host allow-list (exact match or trusted suffix).
  IF NOT (
    host = 'gravatar.com'
    OR host = 'www.gravatar.com'
    OR host = 'secure.gravatar.com'
    OR host = 'lh3.googleusercontent.com'
    OR host = 'avatars.githubusercontent.com'
    OR host = 'api.dicebear.com'
    OR host = 'res.cloudinary.com'
    OR host = 'i.imgur.com'
    OR host LIKE '%.supabase.co'
    OR host LIKE '%.supabase.in'
  ) THEN
    RAISE EXCEPTION 'avatar_url host % is not on the trusted allow-list', host;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_avatar_url ON public.profiles;
CREATE TRIGGER profiles_validate_avatar_url
BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_avatar_url();

-- Clear any existing avatar_url values that would no longer pass the allow-list,
-- so future updates to those profile rows don't fail on unrelated column changes.
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND NOT (
    lower(split_part(split_part(split_part(regexp_replace(avatar_url, '^https?://', ''), '/', 1), '?', 1), ':', 1)) IN (
      'gravatar.com','www.gravatar.com','secure.gravatar.com',
      'lh3.googleusercontent.com','avatars.githubusercontent.com',
      'api.dicebear.com','res.cloudinary.com','i.imgur.com'
    )
    OR lower(split_part(split_part(split_part(regexp_replace(avatar_url, '^https?://', ''), '/', 1), '?', 1), ':', 1)) LIKE '%.supabase.co'
    OR lower(split_part(split_part(split_part(regexp_replace(avatar_url, '^https?://', ''), '/', 1), '?', 1), ':', 1)) LIKE '%.supabase.in'
  );
