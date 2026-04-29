-- Lock down SECURITY DEFINER functions from public API
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_inactive_sessions() FROM PUBLIC, anon, authenticated;

-- Tighten the update policy: a signed-in user can only update their own session;
-- guests (anon) can only update sessions that have no user_id attached.
DROP POLICY IF EXISTS "Update own session or guest session" ON public.user_sessions;

CREATE POLICY "Authenticated update own session"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon update guest session"
  ON public.user_sessions FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);