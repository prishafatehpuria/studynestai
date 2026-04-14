import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotes } from '@/hooks/useNotes';
import { useQuiz } from '@/hooks/useQuiz';
import { useGamification } from '@/hooks/useGamification';
import { QuizQuestion } from '@/types/task';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Trophy, Target, Timer, ChevronLeft, Brain, Flame, Star, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type QuizState = 'setup' | 'playing' | 'results';
type Difficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export default function QuizMode() {
  const { notes, subjects } = useNotes();
  const { addResult, stats, subjectStats } = useQuiz();
  const { addPoints, data: gamData } = useGamification();

  const [state, setState] = useState<QuizState>('setup');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<Difficulty>('adaptive');
  const [questionCount, setQuestionCount] = useState(10);
  const [timerEnabled, setTimerEnabled] = useState(true);

  // Game state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; userAnswer: string; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [combo, setCombo] = useState(1);
  const [xp, setXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTime, setTotalTime] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  // Adaptive difficulty tracking
  const [adaptiveCorrect, setAdaptiveCorrect] = useState(0);
  const [adaptiveTotal, setAdaptiveTotal] = useState(0);

  const currentQ = questions[currentIdx];

  const getAdaptiveDifficulty = useCallback(() => {
    if (adaptiveTotal < 3) return 'medium';
    const rate = adaptiveCorrect / adaptiveTotal;
    if (rate >= 0.8) return 'hard';
    if (rate <= 0.4) return 'easy';
    return 'medium';
  }, [adaptiveCorrect, adaptiveTotal]);

  const startQuiz = async () => {
    setGenerating(true);
    try {
      const relevantNotes = selectedSubject === 'all'
        ? notes
        : notes.filter(n => n.subject === selectedSubject);

      if (relevantNotes.length === 0) {
        toast.error('No notes found for this subject');
        setGenerating(false);
        return;
      }

      const notesContent = relevantNotes.map(n => `Subject: ${n.subject}\nTitle: ${n.title}\n${n.content}`).join('\n\n---\n\n');
      const diff = difficulty === 'adaptive' ? 'medium' : difficulty;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-study-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate exactly ${questionCount} quiz questions from these notes. Difficulty: ${diff}. Return ONLY valid JSON array. Each object must have:
- "type": "mcq" or "true_false" or "short_answer"
- "question": string
- "options": string[] (4 options for mcq, ["True","False"] for true_false, empty for short_answer)
- "correctAnswer": string (must match one option exactly)
- "explanation": string (brief explanation)
- "difficulty": "${diff}"
- "subject": string

Mix types: ~60% mcq, ~20% true_false, ~20% short_answer.

Notes:\n${notesContent.slice(0, 4000)}`
          }],
          mode: 'chat',
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Parse failed');
      const rawQuestions = JSON.parse(jsonMatch[0]);
      const validQuestions: QuizQuestion[] = rawQuestions.map((q: any, i: number) => ({
        id: crypto.randomUUID(),
        type: ['mcq', 'true_false', 'short_answer'].includes(q.type) ? q.type : 'mcq',
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || diff,
        subject: q.subject || selectedSubject,
      }));

      // Shuffle
      for (let i = validQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validQuestions[i], validQuestions[j]] = [validQuestions[j], validQuestions[i]];
      }

      setQuestions(validQuestions);
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnswers([]);
      setStreak(0);
      setMaxStreak(0);
      setCombo(1);
      setXp(0);
      setTimeLeft(30);
      setTotalTime(0);
      setAdaptiveCorrect(0);
      setAdaptiveTotal(0);
      startTimeRef.current = Date.now();
      setState('playing');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate quiz. Make sure you have notes!');
    } finally {
      setGenerating(false);
    }
  };

  // Timer
  useEffect(() => {
    if (state !== 'playing' || !timerEnabled || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer('__timeout__');
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state, timerEnabled, showResult, currentIdx]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    clearInterval(timerRef.current);
    const isCorrect = answer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();

    setSelectedAnswer(answer);
    setShowResult(true);
    setAdaptiveTotal(prev => prev + 1);

    if (isCorrect) {
      const baseXp = currentQ.difficulty === 'hard' ? 30 : currentQ.difficulty === 'medium' ? 20 : 10;
      const comboXp = Math.floor(baseXp * combo);
      setXp(prev => prev + comboXp);
      setStreak(prev => {
        const newStreak = prev + 1;
        setMaxStreak(m => Math.max(m, newStreak));
        return newStreak;
      });
      setCombo(prev => Math.min(prev + 0.5, 4));
      setAdaptiveCorrect(prev => prev + 1);
    } else {
      setStreak(0);
      setCombo(1);
    }

    setAnswers(prev => [...prev, { questionId: currentQ.id, userAnswer: answer, correct: isCorrect }]);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShortAnswer('');
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const correct = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correct / questions.length) * 100);

    const result = addResult({
      subject: selectedSubject === 'all' ? 'Mixed' : selectedSubject,
      totalQuestions: questions.length,
      correctAnswers: correct,
      accuracy,
      xpEarned: xp,
      streak: maxStreak,
      timeTaken,
      questions: answers,
    });

    addPoints(xp, 'task');
    setTotalTime(timeTaken);
    setState('results');
  };

  // SETUP
  if (state === 'setup') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Stats row */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Quizzes', value: stats.totalQuizzes, icon: Brain },
            { label: 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: Target },
            { label: 'Total XP', value: stats.totalXp, icon: Zap },
            { label: 'Best Streak', value: stats.bestStreak, icon: Flame },
          ].map(s => (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="flex flex-col items-center p-3">
                <s.icon className="mb-1 h-4 w-4 text-primary" />
                <p className="font-heading text-lg font-bold">{s.value}</p>
                <p className="font-body text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subject strengths */}
        {subjectStats.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subjectStats.map(s => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="font-body text-sm w-24 truncate">{s.subject}</span>
                    <Progress value={s.accuracy} className="flex-1 h-2" />
                    <Badge variant={s.strength === 'strong' ? 'default' : s.strength === 'moderate' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {s.accuracy}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz setup */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Start Quiz
            </CardTitle>
            <CardDescription className="font-body text-sm">AI generates questions from your notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1 block">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1 block">Difficulty</label>
                <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="adaptive">Adaptive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1 block">Questions</label>
                <Select value={String(questionCount)} onValueChange={v => setQuestionCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={timerEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimerEnabled(!timerEnabled)}
                  className="gap-1"
                >
                  <Timer className="h-3 w-3" /> Timer {timerEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>
            <Button onClick={startQuiz} disabled={generating || notes.length === 0} className="w-full gap-2">
              <Zap className="h-4 w-4" /> {generating ? 'Generating...' : 'Start Game'}
            </Button>
            {notes.length === 0 && (
              <p className="font-body text-xs text-muted-foreground text-center">Add some notes first to generate quizzes!</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // PLAYING
  if (state === 'playing' && currentQ) {
    const correct = answers.filter(a => a.correct).length;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {/* HUD */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { clearInterval(timerRef.current); setState('setup'); }}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Quit
          </Button>
          <div className="flex items-center gap-3 font-body text-sm">
            <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-urgent" /> {streak}</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-warning" /> x{combo.toFixed(1)}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-primary" /> {xp} XP</span>
          </div>
        </div>

        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

        {/* Timer */}
        {timerEnabled && (
          <div className="flex justify-center">
            <Badge variant={timeLeft <= 10 ? 'destructive' : 'outline'} className="gap-1 text-sm">
              <Timer className="h-3 w-3" /> {timeLeft}s
            </Badge>
          </div>
        )}

        {/* Question */}
        <motion.div key={currentQ.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">{currentQ.type === 'mcq' ? 'Multiple Choice' : currentQ.type === 'true_false' ? 'True/False' : 'Short Answer'}</Badge>
                <Badge variant="secondary" className="text-[10px]">{currentQ.difficulty}</Badge>
              </div>
              <CardTitle className="font-heading text-lg mt-2">{currentQ.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentQ.type === 'short_answer' ? (
                <div className="space-y-2">
                  <Input
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    disabled={showResult}
                    onKeyDown={e => e.key === 'Enter' && !showResult && shortAnswer && handleAnswer(shortAnswer)}
                  />
                  {!showResult && (
                    <Button onClick={() => handleAnswer(shortAnswer)} disabled={!shortAnswer} className="w-full">Submit</Button>
                  )}
                </div>
              ) : (
                currentQ.options?.map((option, i) => {
                  let variant: 'outline' | 'default' | 'destructive' = 'outline';
                  if (showResult) {
                    if (option === currentQ.correctAnswer) variant = 'default';
                    else if (option === selectedAnswer && !answers[answers.length - 1]?.correct) variant = 'destructive';
                  }
                  return (
                    <Button
                      key={i}
                      variant={variant}
                      className={`w-full justify-start text-left font-body ${showResult && option === currentQ.correctAnswer ? 'bg-success text-success-foreground hover:bg-success/90' : ''}`}
                      onClick={() => !showResult && handleAnswer(option)}
                      disabled={showResult}
                    >
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span> {option}
                    </Button>
                  );
                })
              )}

              {/* Result feedback */}
              <AnimatePresence>
                {showResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 font-body text-sm ${answers[answers.length - 1]?.correct ? 'text-success' : 'text-destructive'}`}>
                      {answers[answers.length - 1]?.correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {answers[answers.length - 1]?.correct ? 'Correct!' : `Wrong! Answer: ${currentQ.correctAnswer}`}
                    </div>
                    {currentQ.explanation && (
                      <p className="font-body text-xs text-muted-foreground">{currentQ.explanation}</p>
                    )}
                    <Button onClick={nextQuestion} className="w-full">
                      {currentIdx < questions.length - 1 ? 'Next Question' : 'See Results'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // RESULTS
  if (state === 'results') {
    const correct = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correct / questions.length) * 100);
    const grade = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 60 ? 'C' : accuracy >= 50 ? 'D' : 'F';
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-center py-8">
              <Trophy className="mb-3 h-12 w-12 text-primary" />
              <p className="font-heading text-4xl font-bold">{grade}</p>
              <p className="font-body text-muted-foreground">{accuracy}% accuracy</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Correct', value: `${correct}/${questions.length}` },
            { label: 'XP Earned', value: xp },
            { label: 'Best Streak', value: maxStreak },
            { label: 'Time', value: `${mins}:${String(secs).padStart(2, '0')}` },
          ].map(s => (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="flex flex-col items-center p-3">
                <p className="font-heading text-lg font-bold">{s.value}</p>
                <p className="font-body text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setState('setup')} className="flex-1">New Quiz</Button>
          <Button variant="outline" onClick={startQuiz} className="flex-1 gap-1">
            <RotateCcw className="h-3 w-3" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function RotateCcw(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  );
}
