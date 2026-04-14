import { useState, useRef, useEffect } from 'react';
import { useAIChat, AIMode } from '@/hooks/useAIChat';
import { useTasks } from '@/hooks/useTasks';
import { useNotes } from '@/hooks/useNotes';
import { useGoals } from '@/hooks/useGoals';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Trash2, Bot, User, GraduationCap, Users,
  Scissors, CalendarCheck, Brain, BookOpen, Camera, RefreshCw,
  Sparkles, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const modes: { id: AIMode; label: string; icon: any; desc: string; color: string }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle, desc: 'General study help & problem solving', color: 'bg-primary/15 text-primary' },
  { id: 'explain_teacher', label: 'Teacher Mode', icon: GraduationCap, desc: 'Explain like a teacher', color: 'bg-success/15 text-success' },
  { id: 'explain_friend', label: 'Friend Mode', icon: Users, desc: 'Explain like a friend', color: 'bg-warning/15 text-warning' },
  { id: 'break_tasks', label: 'Task Breakdown', icon: Scissors, desc: 'Break big tasks into steps', color: 'bg-accent/30 text-accent-foreground' },
  { id: 'suggest_study', label: 'Study Plan', icon: CalendarCheck, desc: 'What to study today', color: 'bg-primary/15 text-primary' },
  { id: 'exam_predict', label: 'Exam Predictor', icon: Brain, desc: 'Predict exam questions', color: 'bg-urgent/15 text-urgent' },
  { id: 'story_mode', label: 'Story Mode', icon: BookOpen, desc: 'Turn notes into stories', color: 'bg-success/15 text-success' },
  { id: 'snap_study', label: 'Snap & Study', icon: Camera, desc: 'Photo/text to quiz', color: 'bg-warning/15 text-warning' },
  { id: 'auto_adjust', label: 'Reschedule', icon: RefreshCw, desc: 'Auto-adjust missed tasks', color: 'bg-urgent/15 text-urgent' },
];

export default function AIAssistant() {
  const { messages, isLoading, sendMessage, clearMessages, stopGeneration } = useAIChat();
  const { tasks, activeTasks, overdueTasks } = useTasks();
  const { notes } = useNotes();
  const { goals } = useGoals();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AIMode>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getContext = () => {
    const ctx: any = {};
    if (['suggest_study', 'auto_adjust', 'break_tasks'].includes(mode)) {
      ctx.tasks = activeTasks.map(t => ({
        name: t.name, subject: t.subject, dueDate: t.dueDate, priority: t.priority,
      }));
    }
    if (['exam_predict', 'story_mode', 'explain_teacher', 'explain_friend'].includes(mode)) {
      ctx.notes = notes.slice(0, 10).map(n => `[${n.subject}] ${n.title}: ${n.content}`).join('\n\n');
    }
    if (mode === 'auto_adjust') {
      ctx.tasks = [
        ...overdueTasks.map(t => ({ ...t, status: 'overdue' })),
        ...activeTasks.filter(t => !overdueTasks.includes(t)).map(t => ({ ...t, status: 'active' })),
      ].map(t => ({ name: t.name, subject: t.subject, dueDate: t.dueDate, priority: t.priority, status: (t as any).status }));
    }
    if (mode === 'suggest_study') {
      ctx.goals = goals.filter(g => g.status === 'active').map(g => ({
        title: g.title, subject: g.subject, targetDate: g.targetDate,
      }));
    }
    return Object.keys(ctx).length > 0 ? ctx : undefined;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text, mode, getContext());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts: Record<string, string[]> = {
    chat: ['Help me solve this math problem', 'Explain photosynthesis simply', 'How do I write a great essay?'],
    suggest_study: ['What should I study today?', 'Make me a 2-hour study plan', 'Which subjects need the most attention?'],
    break_tasks: ['Break down my research paper', 'Help me plan my science project', 'Divide my exam prep into steps'],
    exam_predict: ['What questions might come in my math exam?', 'Predict important topics for science', 'Most likely essay questions?'],
    story_mode: ['Turn my history notes into a story', 'Make biology fun with analogies', 'Explain physics through real life'],
    auto_adjust: ['I missed 3 days of study, help me catch up', 'Rebalance my schedule for this week', 'I\'m behind on deadlines, what should I do?'],
  };

  const currentQuickPrompts = quickPrompts[mode] || quickPrompts.chat;

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-5xl flex-col gap-4">
      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); clearMessages(); }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-medium transition-all',
              mode === m.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden shadow-sm">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-12"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="font-heading text-xl font-bold">
                    {modes.find(m => m.id === mode)?.label}
                  </h2>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {modes.find(m => m.id === mode)?.desc}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {currentQuickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(prompt);
                        inputRef.current?.focus();
                      }}
                      className="rounded-lg border border-border bg-card px-3 py-2 font-body text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none font-body text-sm dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="font-body text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <CardContent className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'snap_study'
                  ? 'Paste text from your textbook or notes here...'
                  : 'Type your message...'
              }
              rows={1}
              className="min-h-[40px] max-h-[120px] resize-none font-body text-sm"
            />
            <div className="flex gap-1.5">
              {isLoading ? (
                <Button size="icon" variant="destructive" onClick={stopGeneration} className="h-10 w-10 shrink-0">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
              {messages.length > 0 && (
                <Button size="icon" variant="ghost" onClick={clearMessages} className="h-10 w-10 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
