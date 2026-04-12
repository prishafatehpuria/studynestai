import { Task } from '@/types/task';
import { getUrgency } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { Check, Trash2, Clock, AlertTriangle, AlertCircle, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const urgencyConfig = {
  overdue: {
    border: 'border-l-urgent',
    bg: 'bg-urgent/5',
    badge: 'bg-urgent text-urgent-foreground',
    label: 'Overdue',
    Icon: AlertCircle,
  },
  urgent: {
    border: 'border-l-urgent',
    bg: 'bg-urgent/5',
    badge: 'bg-urgent text-urgent-foreground',
    label: 'Due Soon',
    Icon: AlertTriangle,
  },
  upcoming: {
    border: 'border-l-warning',
    bg: 'bg-warning/5',
    badge: 'bg-warning text-warning-foreground',
    label: 'Upcoming',
    Icon: Clock,
  },
  relaxed: {
    border: 'border-l-success',
    bg: 'bg-success/5',
    badge: 'bg-success text-success-foreground',
    label: 'On Track',
    Icon: Leaf,
  },
};

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const urgency = task.completed ? null : getUrgency(task.dueDate);
  const config = urgency ? urgencyConfig[urgency] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border-l-4 p-4 shadow-sm transition-all hover:shadow-md",
        task.completed
          ? "border-l-muted bg-muted/40 opacity-70"
          : config?.border,
        !task.completed && config?.bg,
        task.completed && "bg-card"
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.completed
            ? "border-success bg-success"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {task.completed && <Check className="h-4 w-4 text-success-foreground" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("font-body font-semibold text-base leading-tight", task.completed && "line-through text-muted-foreground")}>
          {task.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-body text-xs font-medium text-primary-foreground/80">
            {task.subject}
          </span>
          <span className="text-muted-foreground font-body">
            {format(new Date(task.dueDate + 'T00:00:00'), 'MMM d, yyyy')}
          </span>
          {config && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", config.badge)}>
              <config.Icon className="h-3 w-3" />
              {config.label}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
