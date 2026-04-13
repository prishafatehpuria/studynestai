import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Trash2, CheckCircle2, Circle, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

export default function Goals() {
  const { activeGoals, completedGoals, addGoal, toggleMilestone, deleteGoal, getGoalProgress } = useGoals();
  const { subjects } = useTasks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [milestonesText, setMilestonesText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !targetDate) return;
    const milestones = milestonesText.split('\n').filter(m => m.trim());
    addGoal(title, description, subject, targetDate.toISOString().split('T')[0], milestones);
    setTitle(''); setDescription(''); setSubject(''); setTargetDate(undefined); setMilestonesText('');
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-body font-semibold">
              <Plus className="h-4 w-4" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Set a New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Goal Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ace the Math Final" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What do you want to achieve?" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" list="goal-subjects" required />
                  {subjects.length > 0 && (
                    <datalist id="goal-subjects">
                      {subjects.map(s => <option key={s} value={s} />)}
                    </datalist>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {targetDate ? format(targetDate, "MMM d") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={targetDate} onSelect={setTargetDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Milestones (one per line)</Label>
                <Textarea value={milestonesText} onChange={e => setMilestonesText(e.target.value)} placeholder={"Review Chapter 1-3\nPractice problem sets\nTake mock exam"} rows={4} />
              </div>
              <Button type="submit" className="w-full font-body font-semibold">Create Goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="font-body">Active ({activeGoals.length})</TabsTrigger>
          <TabsTrigger value="completed" className="font-body">Completed ({completedGoals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4 space-y-4">
          {activeGoals.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
              <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-heading text-lg text-muted-foreground">No active goals</p>
              <p className="mt-1 font-body text-sm text-muted-foreground/70">Set your first goal to start!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {activeGoals.map(goal => {
                const progress = getGoalProgress(goal);
                return (
                  <motion.div key={goal.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="group shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-body text-xs font-medium text-primary-foreground/80">
                              {goal.subject}
                            </span>
                            <CardTitle className="mt-2 font-heading text-lg">{goal.title}</CardTitle>
                            {goal.description && (
                              <p className="mt-1 font-body text-sm text-muted-foreground">{goal.description}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteGoal(goal.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between font-body text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          Target: {format(new Date(goal.targetDate + 'T00:00:00'), 'MMM d, yyyy')}
                        </div>
                        {goal.milestones.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            {goal.milestones.map(m => (
                              <button
                                key={m.id}
                                onClick={() => toggleMilestone(goal.id, m.id)}
                                className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
                              >
                                {m.completed ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                                ) : (
                                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className={cn("font-body text-sm", m.completed && "line-through text-muted-foreground")}>
                                  {m.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4 space-y-4">
          {completedGoals.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-muted-foreground">No completed goals yet</p>
          ) : (
            completedGoals.map(goal => (
              <Card key={goal.id} className="shadow-sm opacity-70">
                <CardContent className="flex items-center gap-3 p-4">
                  <Trophy className="h-5 w-5 text-warning" />
                  <div className="flex-1">
                    <p className="font-body font-semibold">{goal.title}</p>
                    <p className="font-body text-xs text-muted-foreground">{goal.subject}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGoal(goal.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
