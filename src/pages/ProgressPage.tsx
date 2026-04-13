import { useTasks, getUrgency } from '@/hooks/useTasks';
import { useStudySessions } from '@/hooks/useStudySessions';
import { useGamification } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';
import { CheckCircle2, ListTodo, BarChart3, BookOpen, Timer, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export default function ProgressPage() {
  const { tasks, activeTasks, completedTasks, progress, subjects } = useTasks();
  const { sessions, totalMinutesWeek } = useStudySessions();
  const { data: gamData } = useGamification();

  const subjectStats = useMemo(() => {
    return subjects.map(subject => {
      const subjectTasks = tasks.filter(t => t.subject === subject);
      const completed = subjectTasks.filter(t => t.completed).length;
      const total = subjectTasks.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const overdue = subjectTasks.filter(t => !t.completed && getUrgency(t.dueDate) === 'overdue').length;
      const studyMinutes = sessions.filter(s => s.subject === subject).reduce((sum, s) => sum + s.duration, 0);
      return { subject, completed, total, pct, overdue, studyMinutes };
    });
  }, [tasks, subjects, sessions]);

  // Weekly completion data
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTasks = completedTasks.filter(t => {
        const created = t.createdAt?.split('T')[0];
        return created === dateStr;
      }).length;
      const studyMins = sessions.filter(s => s.date.startsWith(dateStr)).reduce((sum, s) => sum + s.duration, 0);
      days.push({ day: format(date, 'EEE'), tasks: dayTasks, minutes: studyMins });
    }
    return days;
  }, [completedTasks, sessions]);

  // Subject pie data
  const pieData = useMemo(() => {
    return subjectStats.filter(s => s.total > 0).map(s => ({
      name: s.subject,
      value: s.total,
    }));
  }, [subjectStats]);

  const COLORS = [
    'hsl(199, 92%, 65%)', 'hsl(0, 80%, 82%)', 'hsl(142, 60%, 45%)',
    'hsl(45, 93%, 58%)', 'hsl(280, 60%, 65%)', 'hsl(30, 80%, 60%)',
  ];

  // Weak subjects
  const weakSubjects = useMemo(() => {
    return subjectStats
      .filter(s => s.total >= 2 && s.pct < 50)
      .sort((a, b) => a.pct - b.pct);
  }, [subjectStats]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <ListTodo className="mb-1 h-6 w-6 text-primary" />
            <p className="font-heading text-2xl font-bold">{tasks.length}</p>
            <p className="font-body text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <CheckCircle2 className="mb-1 h-6 w-6 text-success" />
            <p className="font-heading text-2xl font-bold">{completedTasks.length}</p>
            <p className="font-body text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <TrendingUp className="mb-1 h-6 w-6 text-warning" />
            <p className="font-heading text-2xl font-bold">{progress}%</p>
            <p className="font-body text-xs text-muted-foreground">Completion</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <Timer className="mb-1 h-6 w-6 text-accent" />
            <p className="font-heading text-2xl font-bold">{totalMinutesWeek}m</p>
            <p className="font-body text-xs text-muted-foreground">Study (Week)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Activity Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fontFamily: 'Nunito Sans' }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontFamily: 'Nunito Sans',
                  }}
                />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Study (min)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Tasks by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: 'Nunito Sans' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="font-body text-sm text-muted-foreground">No data yet</p>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1 font-body text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weak Subjects Alert */}
      {weakSubjects.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-heading text-base text-warning">
              <AlertTriangle className="h-4 w-4" /> Subjects Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weakSubjects.map(s => (
              <div key={s.subject} className="flex items-center justify-between">
                <span className="font-body text-sm font-medium">{s.subject}</span>
                <div className="flex items-center gap-3">
                  <Progress value={s.pct} className="h-2 w-24" />
                  <span className="font-body text-xs text-muted-foreground">{s.pct}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per Subject Detailed */}
      {subjectStats.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <BookOpen className="h-4 w-4" /> Progress by Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {subjectStats.map(s => (
              <div key={s.subject}>
                <div className="mb-1.5 flex items-center justify-between font-body text-sm">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-muted-foreground">
                    {s.completed}/{s.total} · {s.pct}%
                    {s.overdue > 0 && <span className="ml-2 text-urgent">{s.overdue} overdue</span>}
                  </span>
                </div>
                <Progress value={s.pct} className="h-2" />
                {s.studyMinutes > 0 && (
                  <p className="mt-1 font-body text-xs text-muted-foreground">{s.studyMinutes} minutes studied</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
