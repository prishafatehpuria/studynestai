import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Clock, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type SessionRow = {
  id: string;
  session_id: string;
  user_id: string | null;
  user_agent: string | null;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
};

function formatDuration(secs: number) {
  if (!secs || secs < 0) return '0s';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function shortAgent(ua: string | null) {
  if (!ua) return 'Unknown';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Other';
}

export default function Analytics() {
  const isAdmin = useIsAdmin();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false })
      .limit(1000);
    if (!error && data) setSessions(data as SessionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    const channel = supabase
      .channel('analytics-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        refresh();
      })
      .subscribe();
    const interval = setInterval(refresh, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin]);

  if (isAdmin === null) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="font-heading text-2xl font-bold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Admin-only area. Ask an existing admin to grant your account the <code>admin</code> role
          in the <code>user_roles</code> table.
        </p>
      </div>
    );
  }

  // Stats
  const now = Date.now();
  const activeCutoff = now - 5 * 60 * 1000;
  const activeSessions = sessions.filter(
    (s) => s.is_active && new Date(s.last_activity_at).getTime() >= activeCutoff,
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayVisitors = sessions.filter(
    (s) => new Date(s.started_at).getTime() >= todayStart.getTime(),
  );
  const finished = sessions.filter((s) => (s.duration_seconds ?? 0) > 0);
  const avgDuration =
    finished.length === 0
      ? 0
      : Math.round(
          finished.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / finished.length,
        );

  // Daily traffic (last 7 days)
  const days: { date: string; visits: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const count = sessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    days.push({
      date: d.toLocaleDateString(undefined, { weekday: 'short' }),
      visits: count,
    });
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Analytics</h1>
        <p className="font-body text-muted-foreground">
          Realtime visitor activity and session insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Active now"
          value={activeSessions.length.toString()}
          hint="Last 5 min"
          accent
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Today's visitors"
          value={todayVisitors.length.toString()}
          hint="Sessions started today"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg session"
          value={formatDuration(avgDuration)}
          hint={`${finished.length} finished sessions`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="7-day total"
          value={sessions.length.toString()}
          hint="All sessions"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Daily traffic (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days}>
              <defs>
                <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="hsl(var(--primary))"
                fill="url(#visitGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Currently active</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : activeSessions.length === 0 ? (
            <p className="text-muted-foreground">No active sessions right now.</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      <span className="font-body text-sm font-medium">
                        {s.user_id ? `User ${s.user_id.slice(0, 8)}` : 'Guest'}
                      </span>
                      <Badge variant="secondary">{shortAgent(s.user_agent)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Started {new Date(s.started_at).toLocaleTimeString()} · last activity{' '}
                      {new Date(s.last_activity_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {formatDuration(
                      Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Who</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 25).map((s) => {
                  const dur =
                    s.duration_seconds ??
                    Math.round(
                      (new Date(s.last_activity_at).getTime() -
                        new Date(s.started_at).getTime()) /
                        1000,
                    );
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 pr-4">
                        {s.user_id ? `User ${s.user_id.slice(0, 8)}` : 'Guest'}
                      </td>
                      <td className="py-2 pr-4">{shortAgent(s.user_agent)}</td>
                      <td className="py-2 pr-4">
                        {new Date(s.started_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{formatDuration(dur)}</td>
                      <td className="py-2 pr-4">
                        {s.is_active &&
                        new Date(s.last_activity_at).getTime() >= activeCutoff ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Ended</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-primary/50' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="font-body text-sm text-muted-foreground">{label}</span>
          <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        </div>
        <div className="mt-2 font-heading text-3xl font-bold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
