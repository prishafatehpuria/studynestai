DROP POLICY IF EXISTS "Anyone can create a session" ON public.user_sessions;

CREATE POLICY "Authenticated insert own session"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon insert guest session"
  ON public.user_sessions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);