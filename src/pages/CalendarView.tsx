import { useState, useMemo } from 'react';
import { useTasks, getUrgency } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CalendarView() {
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const today = new Date();

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    tasks.forEach(t => {
      const key = t.dueDate;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  // Month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const monthDays: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    monthDays.push(day);
    day = addDays(day, 1);
  }

  // Week view
  const weekStart = startOfWeek(currentDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(weekStart, i));
  }

  const navigate = (dir: number) => {
    if (view === 'month') {
      setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const urgencyDot = (dueDate: string, completed: boolean) => {
    if (completed) return 'bg-success';
    const u = getUrgency(dueDate);
    if (u === 'overdue' || u === 'urgent') return 'bg-urgent';
    if (u === 'upcoming') return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-heading text-lg font-semibold">
            {view === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
          <TabsList>
            <TabsTrigger value="month" className="font-body text-xs">Month</TabsTrigger>
            <TabsTrigger value="week" className="font-body text-xs">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'month' ? (
        <Card className="shadow-sm">
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="p-2 text-center font-body text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {monthDays.map((d, i) => {
                const key = format(d, 'yyyy-MM-dd');
                const dayTasks = tasksByDate[key] || [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[80px] rounded-lg border border-transparent p-1.5 transition-colors",
                      !isSameMonth(d, currentDate) && "opacity-30",
                      isSameDay(d, today) && "border-primary bg-primary/5"
                    )}
                  >
                    <span className={cn(
                      "font-body text-xs",
                      isSameDay(d, today) && "font-bold text-primary"
                    )}>
                      {format(d, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center gap-1">
                          <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", urgencyDot(t.dueDate, t.completed))} />
                          <span className={cn(
                            "truncate font-body text-[10px]",
                            t.completed && "line-through text-muted-foreground"
                          )}>
                            {t.name}
                          </span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="font-body text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((d, i) => {
            const key = format(d, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[key] || [];
            return (
              <Card key={i} className={cn("shadow-sm", isSameDay(d, today) && "ring-2 ring-primary")}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="font-body text-xs text-muted-foreground">
                    {format(d, 'EEE')}
                  </CardTitle>
                  <span className={cn("font-heading text-lg font-bold", isSameDay(d, today) && "text-primary")}>
                    {format(d, 'd')}
                  </span>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0">
                  {dayTasks.length === 0 ? (
                    <p className="py-2 text-center font-body text-[10px] text-muted-foreground">—</p>
                  ) : (
                    dayTasks.map(t => (
                      <div key={t.id} className={cn(
                        "rounded-md p-1.5",
                        t.completed ? "bg-muted/50" : "bg-primary/5"
                      )}>
                        <div className="flex items-center gap-1">
                          <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", urgencyDot(t.dueDate, t.completed))} />
                          <span className={cn(
                            "truncate font-body text-[10px] font-medium",
                            t.completed && "line-through text-muted-foreground"
                          )}>
                            {t.name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
