/*
# Enable Multiplayer Realtime + Google OAuth Profile Auto-Creation

## Summary
This migration completes the multiplayer infrastructure by:
1. Adding the `handle_new_user` trigger so profiles + player_stats are auto-created on signup (including Google OAuth).
2. Adding the `set_updated_at` trigger for automatic `updated_at` maintenance.
3. Enabling realtime publication on game_rooms, room_participants, and match_history.
4. Adding unique constraints (room_id+user_id on participants, user_id on player_stats).
5. Broadening room_participants SELECT so authenticated users can see who's in waiting rooms (needed for the rooms lobby).
6. Adding avatar URL validation (allowlist of image hosts including Google profile pics).

## Changes

### Triggers
- `handle_new_user()` — fires on INSERT to `auth.users`, creates a `profiles` row (username from metadata or email prefix, with uniqueness suffix) and a `player_stats` row. Uses `ON CONFLICT DO NOTHING` for idempotency.
- `set_updated_at()` — fires before UPDATE on profiles, player_stats, game_rooms to bump `updated_at`.

### Constraints
- `UNIQUE (room_id, user_id)` on `room_participants` — prevents double-joining.
- `UNIQUE (user_id)` on `player_stats` — one stats row per user.

### Realtime
- `ALTER TABLE ... REPLICA IDENTITY FULL` on game_rooms, room_participants, match_history.
- Adds these tables to `supabase_realtime` publication.

### RLS Policy Changes
- `room_participants_select` — broadened from "host or self" to "authenticated can see participants of any room" (needed for the rooms lobby to display who's in each room).
- `game_rooms_select` — broadened to "authenticated can see all rooms" (needed for the lobby listing).

### Avatar Validation
- `validate_avatar_url()` trigger — enforces https, length <=2048, and host allow-list including `lh3.googleusercontent.com` for Google profile pictures.
*/

-- ============================================================
-- 1. set_updated_at function + triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS player_stats_set_updated_at ON public.player_stats;
CREATE TRIGGER player_stats_set_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS game_rooms_set_updated_at ON public.game_rooms;
CREATE TRIGGER game_rooms_set_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. handle_new_user trigger (auto-create profile + stats on signup)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  -- Derive username from metadata, or fall back to email prefix
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  -- Sanitize: keep only alnum, underscore, hyphen; max 20 chars
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  base_username := left(base_username, 20);

  IF base_username = '' THEN
    base_username := 'player';
  END IF;

  final_username := base_username;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := left(base_username, 20 - length(suffix::text)) || suffix::text;
  END LOOP;

  -- Insert profile (idempotent)
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, final_username)
  ON CONFLICT (id) DO NOTHING;

  -- Insert player_stats (idempotent)
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Unique constraints
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'room_participants_room_id_user_id_key'
  ) THEN
    ALTER TABLE public.room_participants ADD CONSTRAINT room_participants_room_id_user_id_key UNIQUE (room_id, user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_stats_user_id_key'
  ) THEN
    ALTER TABLE public.player_stats ADD CONSTRAINT player_stats_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- 4. Realtime publication
-- ============================================================

ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.match_history REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_history;
  END IF;
END $$;

-- ============================================================
-- 5. Broaden RLS policies for rooms lobby
-- ============================================================

-- game_rooms: authenticated users can see all rooms (lobby listing)
DROP POLICY IF EXISTS "game_rooms_select" ON public.game_rooms;
CREATE POLICY "game_rooms_select"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (true);

-- room_participants: authenticated users can see participants of any room (lobby display)
DROP POLICY IF EXISTS "room_participants_select" ON public.room_participants;
CREATE POLICY "room_participants_select"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 6. Avatar URL validation
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_avatar_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.avatar_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF length(NEW.avatar_url) > 2048 THEN
    RAISE EXCEPTION 'Avatar URL too long (max 2048 characters)';
  END IF;

  IF NOT (NEW.avatar_url LIKE 'https://%' OR NEW.avatar_url LIKE 'http://%') THEN
    RAISE EXCEPTION 'Avatar URL must use http or https';
  END IF;

  -- Allow-list of image hosts
  IF NEW.avatar_url NOT LIKE 'https://gravatar.com/%'
     AND NEW.avatar_url NOT LIKE 'https://lh3.googleusercontent.com/%'
     AND NEW.avatar_url NOT LIKE 'https://avatars.githubusercontent.com/%'
     AND NEW.avatar_url NOT LIKE 'https://api.dicebear.com/%'
     AND NEW.avatar_url NOT LIKE 'https://res.cloudinary.com/%'
     AND NEW.avatar_url NOT LIKE 'https://i.imgur.com/%'
     AND NEW.avatar_url NOT LIKE 'https://%.supabase.co/%'
     AND NEW.avatar_url NOT LIKE 'https://%.supabase.in/%'
     AND NEW.avatar_url NOT LIKE 'https://images.pexels.com/%'
     AND NEW.avatar_url NOT LIKE 'https://images.unsplash.com/%' THEN
    RAISE EXCEPTION 'Avatar URL host not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_avatar_url ON public.profiles;
CREATE TRIGGER validate_avatar_url
  BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_avatar_url();

-- ============================================================
-- 7. Match history validation
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_match_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.player_id != auth.uid() THEN
    RAISE EXCEPTION 'player_id must match authenticated user';
  END IF;

  IF NEW.result NOT IN ('win', 'loss', 'draw') THEN
    RAISE EXCEPTION 'result must be win, loss, or draw';
  END IF;

  IF NEW.score IS NOT NULL AND (NEW.score < 0 OR NEW.score > 1000000) THEN
    RAISE EXCEPTION 'score out of range';
  END IF;

  IF NEW.duration_seconds IS NOT NULL AND (NEW.duration_seconds < 0 OR NEW.duration_seconds > 86400) THEN
    RAISE EXCEPTION 'duration_seconds out of range';
  END IF;

  IF NEW.opponent_id = NEW.player_id THEN
    RAISE EXCEPTION 'opponent_id cannot equal player_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_match_history_insert ON public.match_history;
CREATE TRIGGER validate_match_history_insert
  BEFORE INSERT ON public.match_history
  FOR EACH ROW EXECUTE FUNCTION public.validate_match_history_insert();

-- Prevent client-side UPDATE/DELETE on match_history (factual ledger)
DROP POLICY IF EXISTS "match_history_update" ON public.match_history;
DROP POLICY IF EXISTS "match_history_delete" ON public.match_history;

NOTIFY pgrst, 'reload schema';
