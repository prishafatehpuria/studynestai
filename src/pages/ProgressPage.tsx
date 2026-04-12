import { useTasks, getUrgency } from '@/hooks/useTasks';
import { useStudySessions } from '@/hooks/useStudySessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';
import { CheckCircle2, ListTodo, BarChart3, BookOpen, Timer } from 'lucide-react';

export default function ProgressPage() {
  const { tasks, activeTasks, completedTasks, progress, subjects } = useTasks();
  const { sessions, totalMinutesWeek } = useStudySessions();

  const subjectStats = useMemo(() => {
    return subjects.map(subject => {
      const subjectTasks = tasks.filter(t => t.subject === subject);
      const completed = subjectTasks.filter(t => t.completed).length;
      const total = subjectTasks.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const overdue = subjectTasks.filter(t => !t.completed && getUrgency(t.dueDate) === 'overdue').length;
      const studyMinutes = sessions
        .filter(s => s.subject === subject)
        .reduce((sum, s) => sum + s.duration, 0);
      return { subject, completed, total, pct, overdue, studyMinutes };
    });
  }, [tasks, subjects, sessions]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
            <BarChart3 className="mb-1 h-6 w-6 text-warning" />
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

      {/* Overall Progress */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">Overall Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {completedTasks.length} of {tasks.length} tasks completed
          </p>
        </CardContent>
      </Card>

      {/* Per Subject */}
      {subjectStats.length > 0 ? (
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
                    {s.overdue > 0 && (
                      <span className="ml-2 text-urgent">{s.overdue} overdue</span>
                    )}
                  </span>
                </div>
                <Progress value={s.pct} className="h-2" />
                {s.studyMinutes > 0 && (
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    {s.studyMinutes} minutes studied
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-heading text-lg text-muted-foreground">No data yet</p>
          <p className="mt-1 font-body text-sm text-muted-foreground/70">Add tasks to see your progress</p>
        </div>
      )}
    </div>
  );
}
