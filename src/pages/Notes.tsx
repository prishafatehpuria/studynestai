import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Notes() {
  const { notes, addNote, editNote, deleteNote, subjects: noteSubjects } = useNotes();
  const { subjects: taskSubjects } = useTasks();
  const allSubjects = [...new Set([...noteSubjects, ...taskSubjects])].sort();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  const filtered = filterSubject === 'all' ? notes : notes.filter(n => n.subject === filterSubject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    if (editId) {
      editNote(editId, { title, subject, content });
    } else {
      addNote(title, subject, content);
    }
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setContent('');
    setEditId(null);
    setOpen(false);
  };

  const startEdit = (note: typeof notes[0]) => {
    setEditId(note.id);
    setTitle(note.title);
    setSubject(note.subject);
    setContent(note.content);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-body font-semibold">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">{editId ? 'Edit Note' : 'New Note'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" required />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" list="note-subjects" required />
                {allSubjects.length > 0 && (
                  <datalist id="note-subjects">
                    {allSubjects.map(s => <option key={s} value={s} />)}
                  </datalist>
                )}
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your notes here..." rows={6} />
              </div>
              <Button type="submit" className="w-full font-body font-semibold">
                {editId ? 'Save Changes' : 'Add Note'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {allSubjects.length > 0 && (
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[160px] font-body text-xs">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {allSubjects.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <StickyNote className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-heading text-lg text-muted-foreground">No notes yet</p>
          <p className="mt-1 font-body text-sm text-muted-foreground/70">Create your first note to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(note => (
            <Card key={note.id} className="group shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-body text-xs font-medium text-primary-foreground/80">
                      {note.subject}
                    </span>
                    <CardTitle className="mt-2 font-heading text-base">{note.title}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(note)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteNote(note.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap font-body text-sm text-muted-foreground">
                  {note.content || 'No content'}
                </p>
                <p className="mt-3 font-body text-[10px] text-muted-foreground/60">
                  Updated {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
