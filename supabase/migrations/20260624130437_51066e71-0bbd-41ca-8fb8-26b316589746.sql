
-- Add direct FK references to profiles for PostgREST relationship inference
ALTER TABLE public.room_participants
  ADD CONSTRAINT room_participants_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.game_rooms
  ADD CONSTRAINT game_rooms_host_id_profiles_fkey
  FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.match_history
  ADD CONSTRAINT match_history_player_id_profiles_fkey
  FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.match_history
  ADD CONSTRAINT match_history_opponent_id_profiles_fkey
  FOREIGN KEY (opponent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Restrict trigger/utility functions from being callable via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
