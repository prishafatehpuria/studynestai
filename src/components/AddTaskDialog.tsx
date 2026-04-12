import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onAdd: (name: string, subject: string, dueDate: string) => void;
  subjects: string[];
}

export function AddTaskDialog({ onAdd, subjects }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !date) return;
    onAdd(name, subject, date.toISOString().split('T')[0]);
    setName('');
    setSubject('');
    setDate(undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 font-body font-semibold shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="h-5 w-5" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name</Label>
            <Input
              id="task-name"
              placeholder="e.g. Math homework Ch.5"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-subject">Subject</Label>
            <Input
              id="task-subject"
              placeholder="e.g. Mathematics"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              list="subject-suggestions"
              maxLength={50}
              required
            />
            {subjects.length > 0 && (
              <datalist id="subject-suggestions">
                {subjects.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" className="w-full font-body font-semibold" disabled={!name.trim() || !subject.trim() || !date}>
            Add Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
