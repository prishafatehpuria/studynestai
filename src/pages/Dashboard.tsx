import { useState } from 'react';
import { useTasks, getUrgency } from '@/hooks/useTasks';
import { useStudySessions } from '@/hooks/useStudySessions';
import { useGamification } from '@/hooks/useGamification';
import { useGoals } from '@/hooks/useGoals';
import { useAIChat } from '@/hooks/useAIChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo,
  TrendingUp, CalendarDays, Timer, Flame, Star, Target, Zap, Sparkles, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const urgencyColors = {
  overdue: 'text-urgent',
  urgent: 'text-urgent',
  upcoming: 'text-warning',
  relaxed: 'text-success',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { tasks, activeTasks, completedTasks, progress, todayTasks, overdueTasks, upcomingTasks } = useTasks();
  const { totalMinutesToday, totalMinutesWeek } = useStudySessions();
  const { data: gamData, levelProgress } = useGamification();
  const { activeGoals, getGoalProgress, goals } = useGoals();
  const { messages: aiMessages, isLoading: aiLoading, sendMessage: sendAI } = useAIChat();
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiRequested, setAiRequested] = useState(false);

  const getAISuggestion = () => {
    if (aiLoading) return;
    setAiRequested(true);
    const ctx = {
      tasks: activeTasks.map(t => ({ name: t.name, subject: t.subject, dueDate: t.dueDate, priority: t.priority })),
      goals: goals.filter(g => g.status === 'active').map(g => ({ title: g.title, subject: g.subject, targetDate: g.targetDate })),
    };
    sendAI('What should I study today? Give me a concise 3-4 bullet point plan for the next 2 hours.', 'suggest_study', ctx);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-5xl space-y-6">
      {/* Gamification Bar */}
      <motion.div variants={item}>
        <Card className="shadow-sm bg-gradient-to-r from-primary/5 via-transparent to-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-heading text-lg font-bold">Level {gamData.level}</p>
                <div className="flex items-center gap-2">
                  <Progress value={levelProgress} className="h-1.5 w-24" />
                  <span className="font-body text-xs text-muted-foreground">{gamData.points} pts</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <Flame className="h-5 w-5 text-urgent" />
                <span className="font-heading text-lg font-bold">{gamData.currentStreak}</span>
                <span className="font-body text-xs text-muted-foreground">day streak</span>
              </div>
              <Link to="/achievements" className="font-body text-xs text-primary hover:underline">View badges →</Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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
      </motion.div>

      {/* Progress */}
      {tasks.length > 0 && (
        <motion.div variants={item}>
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
        </motion.div>
      )}

      <motion.div variants={item} className="grid gap-6 md:grid-cols-2">
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
              <p className="py-4 text-center font-body text-sm text-muted-foreground">No tasks due today 🎉</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
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
              <p className="py-4 text-center font-body text-sm text-muted-foreground">No upcoming tasks</p>
            ) : (
              upcomingTasks.map(task => {
                const urgency = getUrgency(task.dueDate);
                return (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
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
      </motion.div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <motion.div variants={item}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Target className="h-4 w-4 text-primary" /> Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.slice(0, 3).map(goal => {
                const prog = getGoalProgress(goal);
                return (
                  <div key={goal.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium">{goal.title}</p>
                      <p className="font-body text-xs text-muted-foreground">{goal.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={prog} className="h-1.5 w-16" />
                      <span className="font-body text-xs text-muted-foreground">{prog}%</span>
                    </div>
                  </div>
                );
              })}
              <Link to="/goals" className="block pt-1 font-body text-xs text-primary hover:underline">View all goals →</Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Study Suggestion */}
      <motion.div variants={item}>
        <Card className="shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI Study Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!aiRequested ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="font-body text-sm text-muted-foreground text-center">
                  Let AI analyze your tasks and suggest what to study today
                </p>
                <Button onClick={getAISuggestion} className="gap-2 font-body text-sm">
                  <Sparkles className="h-4 w-4" /> Get Study Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {aiLoading && aiMessages.filter(m => m.role === 'assistant').length === 0 ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-body text-sm text-muted-foreground">Analyzing your schedule...</span>
                  </div>
                ) : (
                  <>
                    {aiMessages.filter(m => m.role === 'assistant').slice(-1).map(msg => (
                      <div key={msg.id} className="prose prose-sm max-w-none font-body text-sm dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={getAISuggestion} disabled={aiLoading} className="gap-1 font-body text-xs">
                        <Sparkles className="h-3 w-3" /> Refresh
                      </Button>
                      <Link to="/ai">
                        <Button variant="ghost" size="sm" className="font-body text-xs">Open AI Chat →</Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Add Task', to: '/tasks', icon: ListTodo, color: 'bg-primary/10 text-primary' },
          { label: 'Focus Mode', to: '/focus', icon: Zap, color: 'bg-warning/10 text-warning' },
          { label: 'Set Goal', to: '/goals', icon: Target, color: 'bg-success/10 text-success' },
          { label: 'View Progress', to: '/progress', icon: TrendingUp, color: 'bg-accent/30 text-accent-foreground' },
        ].map(action => (
          <Link key={action.label} to={action.to}>
            <Card className="cursor-pointer shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-body text-xs font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
