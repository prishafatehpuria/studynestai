import { useState, useCallback, useMemo } from 'react';
import { StudySession } from '@/types/task';

const STORAGE_KEY = 'study-planner-sessions';

function loadSessions(): StudySession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: StudySession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>(loadSessions);

  const addSession = useCallback((subject: string, duration: number) => {
    const session: StudySession = {
      id: crypto.randomUUID(),
      subject: subject.trim(),
      duration,
      date: new Date().toISOString(),
      type: 'pomodoro',
    };
    const updated = [...loadSessions(), session];
    setSessions(updated);
    saveSessions(updated);
  }, []);

  const totalMinutesToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(s => s.date.startsWith(today))
      .reduce((sum, s) => sum + s.duration, 0);
  }, [sessions]);

  const totalMinutesWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return sessions
      .filter(s => new Date(s.date) >= weekAgo)
      .reduce((sum, s) => sum + s.duration, 0);
  }, [sessions]);

  return { sessions, addSession, totalMinutesToday, totalMinutesWeek };
}
