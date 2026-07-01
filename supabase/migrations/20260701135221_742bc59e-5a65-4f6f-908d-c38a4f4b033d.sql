
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_participants_user_id_profiles_fkey') THEN
    ALTER TABLE public.room_participants
      ADD CONSTRAINT room_participants_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_rooms_host_id_profiles_fkey') THEN
    ALTER TABLE public.game_rooms
      ADD CONSTRAINT game_rooms_host_id_profiles_fkey
      FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_participants_room_user_unique') THEN
    ALTER TABLE public.room_participants
      ADD CONSTRAINT room_participants_room_user_unique UNIQUE (room_id, user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_stats_user_id_unique') THEN
    ALTER TABLE public.player_stats
      ADD CONSTRAINT player_stats_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
