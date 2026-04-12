import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { TaskCard } from '@/components/TaskCard';
import { AnimatePresence } from 'framer-motion';
import { Filter, ListTodo } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Tasks() {
  const { activeTasks, completedTasks, addTask, editTask, toggleComplete, deleteTask, subjects } = useTasks();
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredActive = useMemo(() => {
    let list = activeTasks;
    if (subjectFilter !== 'all') list = list.filter(t => t.subject === subjectFilter);
    if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    return list;
  }, [activeTasks, subjectFilter, priorityFilter]);

  const filteredCompleted = useMemo(() => {
    let list = completedTasks;
    if (subjectFilter !== 'all') list = list.filter(t => t.subject === subjectFilter);
    return list;
  }, [completedTasks, subjectFilter]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AddTaskDialog onAdd={addTask} subjects={subjects} />
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {subjects.length > 0 && (
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[140px] font-body text-xs">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] font-body text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="font-body">Active ({filteredActive.length})</TabsTrigger>
          <TabsTrigger value="completed" className="font-body">Completed ({filteredCompleted.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4 space-y-3">
          {filteredActive.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
              <ListTodo className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-heading text-lg text-muted-foreground">No active tasks</p>
              <p className="mt-1 font-body text-sm text-muted-foreground/70">Add a task to get started!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredActive.map(task => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onEdit={editTask} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4 space-y-3">
          {filteredCompleted.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-muted-foreground">No completed tasks yet</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredCompleted.map(task => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onEdit={editTask} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
