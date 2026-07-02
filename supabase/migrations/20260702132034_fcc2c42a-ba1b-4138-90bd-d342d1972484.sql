
-- Realtime Authorization: restrict broadcast/presence on game channels
-- to authenticated participants of the referenced room.

CREATE OR REPLACE FUNCTION public.is_room_channel_participant(topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  prefix text;
  code text;
  rid uuid;
BEGIN
  IF topic IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  parts := string_to_array(topic, ':');
  IF array_length(parts, 1) <> 2 THEN
    RETURN false;
  END IF;
  prefix := parts[1];
  code := parts[2];
  IF prefix NOT IN ('tictactoe', 'chain-reaction') THEN
    RETURN false;
  END IF;
  SELECT id INTO rid FROM public.game_rooms WHERE room_code = code LIMIT 1;
  IF rid IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = rid AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_room_channel_participant(text) TO authenticated;

-- Policies on realtime.messages for private channels
DROP POLICY IF EXISTS "game_channel_read" ON realtime.messages;
DROP POLICY IF EXISTS "game_channel_write" ON realtime.messages;

CREATE POLICY "game_channel_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_room_channel_participant(realtime.topic()));

CREATE POLICY "game_channel_write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_room_channel_participant(realtime.topic()));
