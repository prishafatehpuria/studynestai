import { useTasks, getUrgency } from '@/hooks/useTasks';
import { useStudySessions } from '@/hooks/useStudySessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, 
  TrendingUp, CalendarDays, Timer 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const urgencyColors = {
  overdue: 'text-urgent',
  urgent: 'text-urgent',
  upcoming: 'text-warning',
  relaxed: 'text-success',
};

export default function Dashboard() {
  const { tasks, activeTasks, completedTasks, progress, todayTasks, overdueTasks, upcomingTasks } = useTasks();
  const { totalMinutesToday, totalMinutesWeek } = useStudySessions();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Active Tasks</p>
              <p className="font-heading text-2xl font-bold">{activeTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Completed</p>
              <p className="font-heading text-2xl font-bold">{completedTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-urgent/15">
              <AlertTriangle className="h-5 w-5 text-urgent" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Overdue</p>
              <p className="font-heading text-2xl font-bold">{overdueTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15">
              <Timer className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Study Today</p>
              <p className="font-heading text-2xl font-bold">{totalMinutesToday}m</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between font-body text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Overall Progress
              </span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-muted-foreground">
                No tasks due today 🎉
              </p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className={cn("h-2 w-2 rounded-full", urgencyColors[getUrgency(task.dueDate)] === 'text-urgent' ? 'bg-urgent' : urgencyColors[getUrgency(task.dueDate)] === 'text-warning' ? 'bg-warning' : 'bg-success')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-medium">{task.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{task.subject}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Clock className="h-4 w-4 text-warning" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-muted-foreground">
                No upcoming tasks
              </p>
            ) : (
              upcomingTasks.map(task => {
                const urgency = getUrgency(task.dueDate);
                return (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium">{task.name}</p>
                      <p className="font-body text-xs text-muted-foreground">{task.subject}</p>
                    </div>
                    <span className={cn("font-body text-xs font-medium", urgencyColors[urgency])}>
                      {format(new Date(task.dueDate + 'T00:00:00'), 'MMM d')}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Add Task', to: '/tasks', icon: ListTodo, color: 'bg-primary/10 text-primary' },
          { label: 'Calendar', to: '/calendar', icon: CalendarDays, color: 'bg-success/10 text-success' },
          { label: 'Study Timer', to: '/timer', icon: Timer, color: 'bg-warning/10 text-warning' },
          { label: 'View Progress', to: '/progress', icon: TrendingUp, color: 'bg-accent/30 text-accent-foreground' },
        ].map(action => (
          <Link key={action.label} to={action.to}>
            <Card className="cursor-pointer shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-body text-xs font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
