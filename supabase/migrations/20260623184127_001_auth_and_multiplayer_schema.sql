/*
# Authentication and Multiplayer Foundation Schema

This migration creates the core tables for user authentication, profiles,
and the multiplayer room system for RetroVerse Arcade.

## 1. New Tables

### profiles
- `id` (uuid, primary key, references auth.users)
- `username` (text, unique, not null) - Display name chosen by user
- `avatar_url` (text, nullable) - URL to user's avatar image
- `created_at` (timestamptz, default now()) - Account creation timestamp
- `updated_at` (timestamptz, default now()) - Last profile update

### player_stats
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles, unique) - One stats record per user
- `games_played` (integer, default 0) - Total games played
- `games_won` (integer, default 0) - Total games won
- `games_lost` (integer, default 0) - Total games lost
- `achievements` (jsonb, default '[]') - Array of achievement IDs
- `high_scores` (jsonb, default '{}') - Object mapping game_id to best score
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### game_rooms
- `id` (uuid, primary key)
- `code` (text, unique, not null) - Unique 6-character room code
- `host_id` (uuid, references profiles) - Room creator
- `game_type` (text, not null) - Game identifier (e.g., 'tetris', 'sudoku')
- `status` (text, default 'waiting') - 'waiting', 'in_progress', 'completed'
- ` max_players` (integer, default 2) - Maximum players allowed
- `settings` (jsonb, default '{}') - Game-specific settings
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### room_participants
- `id` (uuid, primary key)
- `room_id` (uuid, references game_rooms)
- `user_id` (uuid, references profiles)
- `joined_at` (timestamptz, default now())
- `is_ready` (boolean, default false)
- `score` (integer, default 0)
- UNIQUE constraint on (room_id, user_id)

### game_invitations
- `id` (uuid, primary key)
- `room_id` (uuid, references game_rooms)
- `inviter_id` (uuid, references profiles) - Who sent the invitation
- `invitee_id` (uuid, references profiles) - Who received the invitation
- `status` (text, default 'pending') - 'pending', 'accepted', 'declined', 'expired'
- `created_at` (timestamptz, default now())
- `expires_at` (timestamptz) - When invitation expires

### match_history
- `id` (uuid, primary key)
- `room_id` (uuid, references game_rooms)
- `game_type` (text, not null)
- `player_id` (uuid, references profiles)
- `opponent_id` (uuid, references profiles, nullable) - For 1v1 games
- `result` (text, not null) - 'win', 'loss', 'draw'
- `score` (integer, default 0)
- `duration_seconds` (integer, default 0)
- `created_at` (timestamptz, default now())

## 2. Security

All tables have RLS enabled with owner-scoped policies using auth.uid().
- Users can only read/write their own profiles and stats
- Room hosts can manage their rooms
- Room participants can view rooms they've joined
- Users can only access their own invitations

## 3. Indexes

- profiles_username_idx for username lookups
- game_rooms_code_idx for room code lookups
- room_participants_room_id_idx and room_participants_user_id_idx
- game_invitations_invitee_id_idx for fetching user's invitations
- match_history_player_id_idx for player stats queries
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Player statistics
CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  games_lost integer DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  high_scores jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Game rooms for multiplayer
CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  max_players integer DEFAULT 2,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Room participants (many-to-many)
CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  is_ready boolean DEFAULT false,
  score integer DEFAULT 0,
  UNIQUE (room_id, user_id)
);

-- Game invitations
CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Match history
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES game_rooms(id) ON DELETE SET NULL,
  game_type text NOT NULL,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  result text NOT NULL,
  score integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow viewing other profiles for multiplayer
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Player stats policies - owner only
DROP POLICY IF EXISTS "player_stats_select_own" ON player_stats;
CREATE POLICY "player_stats_select_own" ON player_stats FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "player_stats_insert_own" ON player_stats;
CREATE POLICY "player_stats_insert_own" ON player_stats FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "player_stats_update_own" ON player_stats;
CREATE POLICY "player_stats_update_own" ON player_stats FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Game rooms - host can manage, participants can view
DROP POLICY IF EXISTS "game_rooms_select" ON game_rooms;
CREATE POLICY "game_rooms_select" ON game_rooms FOR SELECT
  TO authenticated USING (
    host_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM room_participants WHERE room_participants.room_id = game_rooms.id AND room_participants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "game_rooms_insert" ON game_rooms;
CREATE POLICY "game_rooms_insert" ON game_rooms FOR INSERT
  TO authenticated WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "game_rooms_update" ON game_rooms;
CREATE POLICY "game_rooms_update" ON game_rooms FOR UPDATE
  TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "game_rooms_delete" ON game_rooms;
CREATE POLICY "game_rooms_delete" ON game_rooms FOR DELETE
  TO authenticated USING (host_id = auth.uid());

-- Room participants
DROP POLICY IF EXISTS "room_participants_select" ON room_participants;
CREATE POLICY "room_participants_select" ON room_participants FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM game_rooms WHERE game_rooms.id = room_participants.room_id AND game_rooms.host_id = auth.uid())
  );

DROP POLICY IF EXISTS "room_participants_insert" ON room_participants;
CREATE POLICY "room_participants_insert" ON room_participants FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "room_participants_update" ON room_participants;
CREATE POLICY "room_participants_update" ON room_participants FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "room_participants_delete" ON room_participants;
CREATE POLICY "room_participants_delete" ON room_participants FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Game invitations - invitee and inviter can access
DROP POLICY IF EXISTS "game_invitations_select" ON game_invitations;
CREATE POLICY "game_invitations_select" ON game_invitations FOR SELECT
  TO authenticated USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

DROP POLICY IF EXISTS "game_invitations_insert" ON game_invitations;
CREATE POLICY "game_invitations_insert" ON game_invitations FOR INSERT
  TO authenticated WITH CHECK (inviter_id = auth.uid());

DROP POLICY IF EXISTS "game_invitations_update" ON game_invitations;
CREATE POLICY "game_invitations_update" ON game_invitations FOR UPDATE
  TO authenticated USING (invitee_id = auth.uid()) WITH CHECK (invitee_id = auth.uid());

-- Match history - players can view their own
DROP POLICY IF EXISTS "match_history_select" ON match_history;
CREATE POLICY "match_history_select" ON match_history FOR SELECT
  TO authenticated USING (player_id = auth.uid() OR opponent_id = auth.uid());

DROP POLICY IF EXISTS "match_history_insert" ON match_history;
CREATE POLICY "match_history_insert" ON match_history FOR INSERT
  TO authenticated WITH CHECK (player_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS game_rooms_code_idx ON game_rooms(code);
CREATE INDEX IF NOT EXISTS room_participants_room_id_idx ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS room_participants_user_id_idx ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS game_invitations_invitee_id_idx ON game_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS match_history_player_id_idx ON match_history(player_id);
CREATE INDEX IF NOT EXISTS match_history_game_type_idx ON match_history(game_type);

-- Function to generate random room code
CREATE OR REPLACE FUNCTION generate_room_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create player_stats on new profile
CREATE OR REPLACE FUNCTION handle_new_profile() RETURNS trigger AS $$
BEGIN
  INSERT INTO player_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_create_profile ON profiles;
CREATE TRIGGER on_create_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();