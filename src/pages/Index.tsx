import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { TaskCard } from '@/components/TaskCard';
import { ProgressBar } from '@/components/ProgressBar';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Index = () => {
  const { tasks, activeTasks, completedTasks, addTask, toggleComplete, deleteTask, progress, subjects } = useTasks();
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const filteredActive = useMemo(() => {
    if (subjectFilter === 'all') return activeTasks;
    return activeTasks.filter(t => t.subject === subjectFilter);
  }, [activeTasks, subjectFilter]);

  const filteredCompleted = useMemo(() => {
    if (subjectFilter === 'all') return completedTasks;
    return completedTasks.filter(t => t.subject === subjectFilter);
  }, [completedTasks, subjectFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5">
            <BookOpen className="h-4 w-4 text-primary-foreground/70" />
            <span className="font-body text-sm font-medium text-primary-foreground/70">Study Planner</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Deadline Tracker
          </h1>
          <p className="mt-2 font-body text-muted-foreground">
            Stay on top of your assignments. Never miss a deadline.
          </p>
        </header>

        {/* Progress */}
        <div className="mb-6">
          <ProgressBar progress={progress} total={tasks.length} completed={completedTasks.length} />
        </div>

        {/* Controls */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <AddTaskDialog onAdd={addTask} subjects={subjects} />
          {subjects.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[160px] font-body">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Active Tasks */}
        <section className="mb-8">
          {filteredActive.length === 0 && filteredCompleted.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-heading text-lg text-muted-foreground">No tasks yet</p>
              <p className="mt-1 font-body text-sm text-muted-foreground/70">Add your first task to get started!</p>
            </div>
          )}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredActive.map(task => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Completed Tasks */}
        {filteredCompleted.length > 0 && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-semibold text-muted-foreground">
              Completed ({filteredCompleted.length})
            </h2>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredCompleted.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Index;
