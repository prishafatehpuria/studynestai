import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, X, Volume2, VolumeX, Coffee, Zap } from 'lucide-react';
import { useStudySessions } from '@/hooks/useStudySessions';
import { useGamification } from '@/hooks/useGamification';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const AMBIENT_SOUNDS = [
  { id: 'rain', label: '🌧️ Rain', frequency: 200 },
  { id: 'forest', label: '🌲 Forest', frequency: 300 },
  { id: 'cafe', label: '☕ Café', frequency: 400 },
  { id: 'ocean', label: '🌊 Ocean', frequency: 150 },
  { id: 'fire', label: '🔥 Fireplace', frequency: 250 },
];

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function FocusMode() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [subject, setSubject] = useState('');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { addSession } = useStudySessions();
  const { addPoints, POINT_VALUES } = useGamification();
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const totalDuration = isBreak ? BREAK_DURATION : WORK_DURATION;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  const stopSound = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const playSound = useCallback((soundId: string) => {
    stopSound();
    const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (!sound) return;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    // Create brown noise for ambient effect
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sound.frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();
  }, [stopSound]);

  const toggleSound = useCallback((soundId: string) => {
    if (activeSound === soundId) {
      stopSound();
      setActiveSound(null);
      setSoundEnabled(false);
    } else {
      playSound(soundId);
      setActiveSound(soundId);
      setSoundEnabled(true);
    }
  }, [activeSound, playSound, stopSound]);

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        setIsRunning(false);
        if (!isBreak && subject.trim()) {
          addSession(subject, 25);
          addPoints(POINT_VALUES.pomodoro, 'pomodoro');
          setSessionsCompleted(s => s + 1);
        }
        setIsBreak(b => !b);
        return isBreak ? WORK_DURATION : BREAK_DURATION;
      }
      return prev - 1;
    });
  }, [isBreak, subject, addSession, addPoints, POINT_VALUES.pomodoro]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  useEffect(() => {
    return () => stopSound();
  }, [stopSound]);

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_DURATION);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isFullscreen) {
        e.preventDefault();
        setIsRunning(r => !r);
      }
      if (e.code === 'Escape') setIsFullscreen(false);
      if (e.code === 'KeyR' && isFullscreen) reset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="mb-4 font-body text-sm text-muted-foreground">
            {isBreak ? '☕ Break Time' : '⚡ Focus Mode'}
          </div>

          <div className="relative mb-8">
            <svg width="320" height="320" className="-rotate-90">
              <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="160" cy="160" r="140" fill="none"
                stroke={isBreak ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-7xl font-bold tabular-nums text-foreground">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              {subject && <span className="mt-2 font-body text-muted-foreground">{subject}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="lg"
              className={cn("gap-2 rounded-full px-10 font-body font-semibold text-lg", isBreak && "bg-success hover:bg-success/90")}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outline" size="icon" onClick={reset} className="rounded-full h-12 w-12">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* Ambient Sounds */}
          <div className="flex flex-wrap justify-center gap-2">
            {AMBIENT_SOUNDS.map(sound => (
              <Button
                key={sound.id}
                variant={activeSound === sound.id ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSound(sound.id)}
                className="rounded-full font-body text-xs"
              >
                {sound.label}
              </Button>
            ))}
          </div>

          <div className="mt-6 font-body text-xs text-muted-foreground/50">
            Space to pause · R to reset · Esc to exit
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Sessions</p>
              <p className="font-heading text-xl font-bold">{sessionsCompleted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            {soundEnabled ? <Volume2 className="h-5 w-5 text-success" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="font-body text-xs text-muted-foreground">Ambient</p>
              <p className="font-heading text-sm font-bold">{activeSound ? AMBIENT_SOUNDS.find(s => s.id === activeSound)?.label : 'Off'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsFullscreen(true)}>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-warning" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Focus Mode</p>
              <p className="font-heading text-sm font-bold text-primary">Enter →</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className="font-body text-sm text-muted-foreground">
            {isBreak ? <span className="flex items-center gap-1"><Coffee className="h-4 w-4" /> Break Time</span> : 'Focus Time'}
          </div>
          <div className="relative">
            <svg width="280" height="280" className="-rotate-90">
              <circle cx="140" cy="140" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="140" cy="140" r="120" fill="none"
                stroke={isBreak ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120} strokeDashoffset={2 * Math.PI * 120 - (progressPercent / 100) * 2 * Math.PI * 120}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-5xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
            </div>
          </div>
          {!isBreak && (
            <div className="w-full max-w-xs space-y-2">
              <Label className="font-body text-sm">What are you studying?</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="text-center" disabled={isRunning} />
            </div>
          )}
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsRunning(!isRunning)} size="lg" className={cn("gap-2 rounded-full px-8 font-body font-semibold", isBreak && "bg-success hover:bg-success/90")}>
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outline" size="icon" onClick={reset} className="rounded-full">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          {/* Ambient Sounds */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {AMBIENT_SOUNDS.map(sound => (
              <Button key={sound.id} variant={activeSound === sound.id ? "default" : "outline"} size="sm" onClick={() => toggleSound(sound.id)} className="rounded-full font-body text-xs">
                {sound.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
