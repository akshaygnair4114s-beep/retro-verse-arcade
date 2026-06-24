DROP POLICY IF EXISTS "Stats viewable by everyone" ON public.player_stats;
CREATE POLICY "Users view own stats" ON public.player_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "History viewable by everyone" ON public.match_history;
CREATE POLICY "Players view own history" ON public.match_history FOR SELECT TO authenticated USING (auth.uid() = player_id OR auth.uid() = opponent_id);