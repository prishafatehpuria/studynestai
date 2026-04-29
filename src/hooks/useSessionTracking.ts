import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'analytics_session_id';
const HEARTBEAT_MS = 60_000; // 1 minute

/**
 * Tracks the current visit in `user_sessions`:
 *  - inserts a row on mount (or reuses one stored in sessionStorage)
 *  - sends a heartbeat every minute updating `last_activity_at`
 *  - marks the session ended on tab close / unmount
 */
export function useSessionTracking() {
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      let sid = sessionStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, sid);

        const { error } = await supabase.from('user_sessions').insert({
          session_id: sid,
          user_id: user?.id ?? null,
          user_agent: navigator.userAgent,
        });
        if (error) console.warn('[analytics] insert failed', error.message);
      }
      if (cancelled) return;
      sessionIdRef.current = sid;

      // Heartbeat
      heartbeat = setInterval(async () => {
        if (!sessionIdRef.current) return;
        await supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', sessionIdRef.current);
      }, HEARTBEAT_MS);
    };

    init();

    const endSession = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      const endedAt = new Date();
      const duration = Math.round((endedAt.getTime() - startedAtRef.current) / 1000);
      // Fire-and-forget; sendBeacon would be ideal but supabase-js works for SPA navigation
      supabase
        .from('user_sessions')
        .update({
          ended_at: endedAt.toISOString(),
          last_activity_at: endedAt.toISOString(),
          duration_seconds: duration,
          is_active: false,
        })
        .eq('session_id', sid);
    };

    window.addEventListener('beforeunload', endSession);

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      window.removeEventListener('beforeunload', endSession);
      endSession();
    };
  }, []);
}
