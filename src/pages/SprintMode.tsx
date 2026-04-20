import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, Plus, X, Play, BookOpen, Brain, RotateCcw, CheckCircle2,
  Trophy, Loader2, Lock, Timer, AlertTriangle, Sparkles, ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useGamification } from '@/hooks/useGamification';
import { cn } from '@/lib/utils';

type SprintQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  chapter?: string;
};

type ChapterContent = {
  revision: string;
  quiz: SprintQuestion[];
  recap: string;
};

type ChapterState = {
  name: string;
  status: 'locked' | 'ready' | 'revising' | 'quizzing' | 'recapping' | 'done';
  content?: ChapterContent;
  answers: (string | null)[];
  score: number;
};

type Phase = 'setup' | 'loading' | 'chapter' | 'final_loading' | 'final' | 'summary';
type ChapterPhase = 'revision' | 'quiz' | 'recap';

const REVISION_SECONDS = 15 * 60;
const QUIZ_SECONDS = 5 * 60;
const RECAP_SECONDS = 2 * 60;

const SPRINT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-study-assistant`;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function SprintMode() {
  const { addPoints } = useGamification();
  const [subject, setSubject] = useState('');
  const [chapterInput, setChapterInput] = useState('');
  const [chapters, setChapters] = useState<ChapterState[]>([]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [activeIdx, setActiveIdx] = useState(0);
  const [chapterPhase, setChapterPhase] = useState<ChapterPhase>('revision');
  const [secondsLeft, setSecondsLeft] = useState(REVISION_SECONDS);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Final test
  const [finalQuestions, setFinalQuestions] = useState<SprintQuestion[]>([]);
  const [finalIdx, setFinalIdx] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<(string | null)[]>([]);
  const [finalSelected, setFinalSelected] = useState<string | null>(null);
  const [finalRevealed, setFinalRevealed] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Countdown
  useEffect(() => {
    if (phase !== 'chapter') return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase, chapterPhase, activeIdx]);

  const addChapter = () => {
    const name = chapterInput.trim();
    if (!name) return;
    if (chapters.length >= 8) {
      toast.error('Max 8 chapters per sprint');
      return;
    }
    setChapters((prev) => [
      ...prev,
      { name, status: prev.length === 0 ? 'ready' : 'locked', answers: [], score: 0 },
    ]);
    setChapterInput('');
  };

  const removeChapter = (i: number) =>
    setChapters((prev) => prev.filter((_, idx) => idx !== i));

  const totalEstimate = chapters.length * 22; // ~22 min per chapter incl. final
  const overallProgress = useMemo(() => {
    if (chapters.length === 0) return 0;
    const done = chapters.filter((c) => c.status === 'done').length;
    return Math.round((done / chapters.length) * 100);
  }, [chapters]);

  async function fetchChapter(name: string): Promise<ChapterContent> {
    const resp = await fetch(SPRINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: 'sprint_chapter', chapter: name, subject }),
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || `Error ${resp.status}`);
    }
    return resp.json();
  }

  async function startSprint() {
    if (chapters.length < 2) {
      toast.error('Add at least 2 chapters');
      return;
    }
    setPhase('loading');
    try {
      // Generate first chapter immediately
      const first = await fetchChapter(chapters[0].name);
      setChapters((prev) =>
        prev.map((c, i) =>
          i === 0
            ? { ...c, content: first, status: 'revising', answers: Array(first.quiz.length).fill(null) }
            : c,
        ),
      );
      setActiveIdx(0);
      setChapterPhase('revision');
      setSecondsLeft(REVISION_SECONDS);
      setPhase('chapter');
      // Pre-fetch the rest in background
      chapters.slice(1).forEach(async (ch, idx) => {
        try {
          const content = await fetchChapter(ch.name);
          setChapters((prev) =>
            prev.map((c, i) =>
              i === idx + 1 ? { ...c, content, answers: Array(content.quiz.length).fill(null) } : c,
            ),
          );
        } catch (e) {
          console.error('Prefetch failed for', ch.name, e);
        }
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate sprint');
      setPhase('setup');
    }
  }

  function advancePhase() {
    if (chapterPhase === 'revision') {
      setChapterPhase('quiz');
      setSecondsLeft(QUIZ_SECONDS);
      setQuizIdx(0);
      setSelected(null);
      setRevealed(false);
      setChapters((prev) => prev.map((c, i) => (i === activeIdx ? { ...c, status: 'quizzing' } : c)));
    } else if (chapterPhase === 'quiz') {
      // tally score
      const ch = chapters[activeIdx];
      if (!ch.content) return;
      const score = ch.answers.reduce(
        (acc, a, i) => (a === ch.content!.quiz[i].correctAnswer ? acc + 1 : acc),
        0,
      );
      setChapters((prev) =>
        prev.map((c, i) => (i === activeIdx ? { ...c, status: 'recapping', score } : c)),
      );
      setChapterPhase('recap');
      setSecondsLeft(RECAP_SECONDS);
    } else {
      // Done with chapter -> unlock next or final
      setChapters((prev) =>
        prev.map((c, i) => {
          if (i === activeIdx) return { ...c, status: 'done' };
          if (i === activeIdx + 1 && c.status === 'locked') return { ...c, status: 'ready' };
          return c;
        }),
      );
      addPoints(20, 'task');
      if (activeIdx + 1 < chapters.length) {
        const next = activeIdx + 1;
        setActiveIdx(next);
        setChapterPhase('revision');
        setSecondsLeft(REVISION_SECONDS);
        setSelected(null);
        setRevealed(false);
        setQuizIdx(0);
        setChapters((prev) =>
          prev.map((c, i) => (i === next ? { ...c, status: 'revising' } : c)),
        );
      } else {
        // All chapters done -> final test
        loadFinalTest();
      }
    }
  }

  async function loadFinalTest() {
    setPhase('final_loading');
    try {
      const resp = await fetch(SPRINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'sprint_final',
          chapters: chapters.map((c) => c.name),
          subject,
        }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setFinalQuestions(data.questions || []);
      setFinalAnswers(Array((data.questions || []).length).fill(null));
      setFinalIdx(0);
      setFinalSelected(null);
      setFinalRevealed(false);
      setPhase('final');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate final test');
      setPhase('summary');
    }
  }

  function answerQuiz(opt: string) {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    setChapters((prev) =>
      prev.map((c, i) => {
        if (i !== activeIdx) return c;
        const next = [...c.answers];
        next[quizIdx] = opt;
        return { ...c, answers: next };
      }),
    );
  }

  function nextQuiz() {
    const ch = chapters[activeIdx];
    if (!ch.content) return;
    if (quizIdx + 1 < ch.content.quiz.length) {
      setQuizIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      advancePhase();
    }
  }

  function answerFinal(opt: string) {
    if (finalRevealed) return;
    setFinalSelected(opt);
    setFinalRevealed(true);
    setFinalAnswers((prev) => {
      const next = [...prev];
      next[finalIdx] = opt;
      return next;
    });
  }

  function nextFinal() {
    if (finalIdx + 1 < finalQuestions.length) {
      setFinalIdx((i) => i + 1);
      setFinalSelected(null);
      setFinalRevealed(false);
    } else {
      const finalCorrect = finalAnswers.reduce(
        (acc, a, i) => (a === finalQuestions[i]?.correctAnswer ? acc + 1 : acc),
        0,
      );
      addPoints(finalCorrect * 5, 'task');
      setPhase('summary');
    }
  }

  function resetSprint() {
    setChapters([]);
    setSubject('');
    setChapterInput('');
    setPhase('setup');
    setActiveIdx(0);
    setChapterPhase('revision');
    setFinalQuestions([]);
    setFinalAnswers([]);
    setFinalIdx(0);
  }

  // ===== SETUP =====
  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-warning shadow-lg">
            <Rocket className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Sprint Mode</h1>
          <p className="font-body text-sm text-muted-foreground">
            Revise multiple chapters in one focused session — AI builds your plan.
          </p>
        </motion.div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Build Your Sprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">Subject (optional)</label>
              <Input
                placeholder="e.g. Biology, History, Calculus..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">
                Chapters ({chapters.length}/8)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Chapter 3: Cell Division"
                  value={chapterInput}
                  onChange={(e) => setChapterInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChapter())}
                />
                <Button onClick={addChapter} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {chapters.length > 0 && (
              <div className="space-y-2">
                {chapters.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-heading text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-body text-sm">{c.name}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeChapter(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            {chapters.length >= 2 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary shrink-0" />
                <div className="font-body text-xs">
                  <p className="font-semibold">~{totalEstimate} minutes total</p>
                  <p className="text-muted-foreground">
                    {chapters.length} chapters × (15m revision + 5m quiz + 2m recap) + final test
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={startSprint}
              disabled={chapters.length < 2}
              className="w-full gap-2 font-body"
              size="lg"
            >
              <Play className="h-4 w-4" /> Start Sprint
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== LOADING =====
  if (phase === 'loading' || phase === 'final_loading') {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="font-heading text-lg font-semibold">
          {phase === 'final_loading' ? 'Building your final mixed test...' : 'AI is preparing your first chapter...'}
        </p>
        <p className="font-body text-sm text-muted-foreground">This takes ~10 seconds</p>
      </div>
    );
  }

  // ===== SUMMARY =====
  if (phase === 'summary') {
    const finalCorrect = finalAnswers.reduce(
      (acc, a, i) => (a === finalQuestions[i]?.correctAnswer ? acc + 1 : acc),
      0,
    );
    const finalPct = finalQuestions.length ? Math.round((finalCorrect / finalQuestions.length) * 100) : 0;
    const totalChapterCorrect = chapters.reduce((acc, c) => acc + c.score, 0);
    const totalChapterQuestions = chapters.reduce((acc, c) => acc + (c.content?.quiz.length || 0), 0);
    const chapterPct = totalChapterQuestions
      ? Math.round((totalChapterCorrect / totalChapterQuestions) * 100)
      : 0;
    const weakChapters = chapters
      .filter((c) => {
        const total = c.content?.quiz.length || 0;
        return total > 0 && c.score / total < 0.6;
      })
      .map((c) => c.name);

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success to-primary shadow-lg">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Sprint Complete!</h1>
          <p className="font-body text-sm text-muted-foreground">
            You revised {chapters.length} chapters. Here's how you did.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Chapter Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold">{chapterPct}%</p>
              <p className="font-body text-xs text-muted-foreground">
                {totalChapterCorrect}/{totalChapterQuestions} correct
              </p>
              <Progress value={chapterPct} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Final Mixed Test</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold">{finalPct}%</p>
              <p className="font-body text-xs text-muted-foreground">
                {finalCorrect}/{finalQuestions.length} correct
              </p>
              <Progress value={finalPct} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Per-Chapter Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chapters.map((c, i) => {
              const total = c.content?.quiz.length || 0;
              const pct = total ? Math.round((c.score / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-body text-sm flex-1 truncate">{c.name}</span>
                  <Progress value={pct} className="h-1.5 w-24" />
                  <span className="font-body text-xs text-muted-foreground w-12 text-right">
                    {c.score}/{total}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {weakChapters.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Weak Areas to Revisit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {weakChapters.map((n) => (
                  <Badge key={n} variant="outline" className="border-warning text-warning">
                    {n}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={resetSprint} className="w-full gap-2" size="lg">
          <RotateCcw className="h-4 w-4" /> New Sprint
        </Button>
      </div>
    );
  }

  // ===== FINAL TEST =====
  if (phase === 'final') {
    const q = finalQuestions[finalIdx];
    if (!q) return null;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-heading font-semibold">Final Mixed Test</span>
            </div>
            <span className="font-body text-sm text-muted-foreground">
              Q{finalIdx + 1} / {finalQuestions.length}
            </span>
          </CardContent>
        </Card>
        <Progress value={((finalIdx + (finalRevealed ? 1 : 0)) / finalQuestions.length) * 100} className="h-2" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs">
              {q.chapter && <Badge variant="outline">{q.chapter}</Badge>}
              <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
            </div>
            <h2 className="font-heading text-lg font-semibold">{q.question}</h2>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isCorrect = opt === q.correctAnswer;
                const isPicked = opt === finalSelected;
                return (
                  <button
                    key={opt}
                    onClick={() => answerFinal(opt)}
                    disabled={finalRevealed}
                    className={cn(
                      'w-full rounded-lg border-2 p-3 text-left font-body text-sm transition-all',
                      !finalRevealed && 'border-border hover:border-primary hover:bg-primary/5',
                      finalRevealed && isCorrect && 'border-success bg-success/10',
                      finalRevealed && isPicked && !isCorrect && 'border-urgent bg-urgent/10',
                      finalRevealed && !isCorrect && !isPicked && 'border-border opacity-50',
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {finalRevealed && q.explanation && (
              <div className="rounded-lg bg-muted/50 p-3 font-body text-sm">
                <p className="font-semibold mb-1">Explanation</p>
                <p className="text-muted-foreground">{q.explanation}</p>
              </div>
            )}
            {finalRevealed && (
              <Button onClick={nextFinal} className="w-full gap-2">
                {finalIdx + 1 < finalQuestions.length ? 'Next' : 'Finish Sprint'} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== CHAPTER (revision/quiz/recap) =====
  const ch = chapters[activeIdx];
  if (!ch?.content) return null;
  const phaseMeta: Record<ChapterPhase, { icon: any; label: string; total: number }> = {
    revision: { icon: BookOpen, label: 'Revision', total: REVISION_SECONDS },
    quiz: { icon: Brain, label: 'Quiz', total: QUIZ_SECONDS },
    recap: { icon: RotateCcw, label: 'Recap', total: RECAP_SECONDS },
  };
  const PhaseIcon = phaseMeta[chapterPhase].icon;
  const phasePct = ((phaseMeta[chapterPhase].total - secondsLeft) / phaseMeta[chapterPhase].total) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Overall progress strip */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="font-heading text-sm font-semibold">Sprint Progress</span>
            </div>
            <span className="font-body text-xs text-muted-foreground">{overallProgress}% complete</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex gap-1">
            {chapters.map((c, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded px-2 py-1 text-center font-body text-[10px] font-medium border',
                  c.status === 'done' && 'bg-success/15 border-success/30 text-success',
                  i === activeIdx && c.status !== 'done' && 'bg-primary/15 border-primary/40 text-primary',
                  c.status === 'locked' && 'bg-muted/40 border-border text-muted-foreground',
                  c.status === 'ready' && i !== activeIdx && 'bg-muted/30 border-border text-muted-foreground',
                )}
              >
                {c.status === 'done' ? <CheckCircle2 className="mx-auto h-3 w-3" /> :
                 c.status === 'locked' ? <Lock className="mx-auto h-3 w-3" /> :
                 `Ch ${i + 1}`}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chapter header + timer */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PhaseIcon className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-heading font-semibold truncate">{ch.name}</p>
                <p className="font-body text-xs text-muted-foreground">
                  Phase: {phaseMeta[chapterPhase].label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-warning" />
              <span className={cn(
                'font-heading text-xl font-bold tabular-nums',
                secondsLeft < 30 && 'text-urgent animate-pulse',
              )}>
                {fmt(secondsLeft)}
              </span>
            </div>
          </div>
          <Progress value={phasePct} className="h-1" />
        </CardContent>
      </Card>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {chapterPhase === 'revision' && (
          <motion.div key="rev" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none font-body dark:prose-invert">
                  <ReactMarkdown>{ch.content.revision}</ReactMarkdown>
                </div>
                <Button onClick={advancePhase} className="mt-6 w-full gap-2" size="lg">
                  Start Quiz <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {chapterPhase === 'quiz' && (() => {
          const q = ch.content.quiz[quizIdx];
          return (
            <motion.div key={`quiz-${quizIdx}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
                    <span className="font-body text-xs text-muted-foreground">
                      {quizIdx + 1} / {ch.content.quiz.length}
                    </span>
                  </div>
                  <h2 className="font-heading text-lg font-semibold">{q.question}</h2>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isCorrect = opt === q.correctAnswer;
                      const isPicked = opt === selected;
                      return (
                        <button
                          key={opt}
                          onClick={() => answerQuiz(opt)}
                          disabled={revealed}
                          className={cn(
                            'w-full rounded-lg border-2 p-3 text-left font-body text-sm transition-all',
                            !revealed && 'border-border hover:border-primary hover:bg-primary/5',
                            revealed && isCorrect && 'border-success bg-success/10',
                            revealed && isPicked && !isCorrect && 'border-urgent bg-urgent/10',
                            revealed && !isCorrect && !isPicked && 'border-border opacity-50',
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {revealed && q.explanation && (
                    <div className="rounded-lg bg-muted/50 p-3 font-body text-sm">
                      <p className="font-semibold mb-1">Why?</p>
                      <p className="text-muted-foreground">{q.explanation}</p>
                    </div>
                  )}
                  {revealed && (
                    <Button onClick={nextQuiz} className="w-full gap-2">
                      {quizIdx + 1 < ch.content.quiz.length ? 'Next Question' : 'See Recap'} <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {chapterPhase === 'recap' && (
          <motion.div key="recap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-success/30">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-success" />
                    <h3 className="font-heading font-semibold">Rapid Recap</h3>
                  </div>
                  <Badge variant="secondary">
                    Score: {ch.score}/{ch.content.quiz.length}
                  </Badge>
                </div>
                <div className="prose prose-sm max-w-none font-body dark:prose-invert">
                  <ReactMarkdown>{ch.content.recap}</ReactMarkdown>
                </div>
                <Button onClick={advancePhase} className="w-full gap-2" size="lg">
                  {activeIdx + 1 < chapters.length ? 'Unlock Next Chapter' : 'Start Final Test'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
