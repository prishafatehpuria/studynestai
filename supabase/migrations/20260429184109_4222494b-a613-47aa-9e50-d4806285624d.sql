-- Roles enum + table (separate from profiles to avoid privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sessions table
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_active ON public.user_sessions (is_active, last_activity_at DESC);
CREATE INDEX idx_user_sessions_user ON public.user_sessions (user_id);
CREATE INDEX idx_user_sessions_started ON public.user_sessions (started_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can start a session
CREATE POLICY "Anyone can create a session"
  ON public.user_sessions FOR INSERT
  WITH CHECK (true);

-- Anyone can update by session_id (heartbeat / end). For owned sessions, must match auth.uid().
CREATE POLICY "Update own session or guest session"
  ON public.user_sessions FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

-- Cleanup function: mark sessions inactive after 5 min idle
CREATE OR REPLACE FUNCTION public.mark_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false,
      ended_at = COALESCE(ended_at, last_activity_at),
      duration_seconds = COALESCE(duration_seconds, EXTRACT(EPOCH FROM (last_activity_at - started_at))::INTEGER)
  WHERE is_active = true
    AND last_activity_at < now() - INTERVAL '5 minutes';
END;
$$;

-- Schedule cleanup every minute via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'mark-inactive-sessions',
  '* * * * *',
  $$ SELECT public.mark_inactive_sessions(); $$
);