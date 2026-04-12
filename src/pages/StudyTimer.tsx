import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Timer, Coffee } from 'lucide-react';
import { useStudySessions } from '@/hooks/useStudySessions';
import { cn } from '@/lib/utils';

const WORK_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes

export default function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [subject, setSubject] = useState('');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const { addSession, totalMinutesToday, totalMinutesWeek } = useStudySessions();
  const intervalRef = useRef<number | null>(null);

  const totalDuration = isBreak ? BREAK_DURATION : WORK_DURATION;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        setIsRunning(false);
        if (!isBreak && subject.trim()) {
          addSession(subject, 25);
          setSessionsCompleted(s => s + 1);
        }
        // Toggle break/work
        setIsBreak(b => !b);
        return isBreak ? WORK_DURATION : BREAK_DURATION;
      }
      return prev - 1;
    });
  }, [isBreak, subject, addSession]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, tick]);

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_DURATION);
  };

  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Timer className="h-5 w-5 text-primary" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Sessions Today</p>
              <p className="font-heading text-xl font-bold">{sessionsCompleted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Timer className="h-5 w-5 text-success" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Study Today</p>
              <p className="font-heading text-xl font-bold">{totalMinutesToday}m</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Timer className="h-5 w-5 text-warning" />
            <div>
              <p className="font-body text-xs text-muted-foreground">This Week</p>
              <p className="font-heading text-xl font-bold">{totalMinutesWeek}m</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 font-heading">
            {isBreak ? <Coffee className="h-5 w-5 text-success" /> : <Timer className="h-5 w-5 text-primary" />}
            {isBreak ? 'Break Time' : 'Focus Time'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          {/* Circular Timer */}
          <div className="relative">
            <svg width="280" height="280" className="-rotate-90">
              <circle
                cx="140" cy="140" r="120"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="140" cy="140" r="120"
                fill="none"
                stroke={isBreak ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-5xl font-bold tabular-nums text-foreground">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="mt-1 font-body text-sm text-muted-foreground">
                {isBreak ? 'Relax & recharge' : 'Stay focused'}
              </span>
            </div>
          </div>

          {/* Subject Input */}
          {!isBreak && (
            <div className="w-full max-w-xs space-y-2">
              <Label className="font-body text-sm">What are you studying?</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="text-center"
                disabled={isRunning}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="lg"
              className={cn(
                "gap-2 rounded-full px-8 font-body font-semibold",
                isBreak && "bg-success hover:bg-success/90"
              )}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outline" size="icon" onClick={reset} className="rounded-full">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
