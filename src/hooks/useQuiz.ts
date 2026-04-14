import { useState, useCallback, useMemo } from 'react';
import { QuizResult } from '@/types/task';

const STORAGE_KEY = 'study-planner-quiz-results';

function loadResults(): QuizResult[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveResults(results: QuizResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function useQuiz() {
  const [results, setResults] = useState<QuizResult[]>(loadResults);

  const addResult = useCallback((result: Omit<QuizResult, 'id' | 'date'>) => {
    const newResult: QuizResult = {
      ...result,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    const updated = [...loadResults(), newResult];
    setResults(updated);
    saveResults(updated);
    return newResult;
  }, []);

  const stats = useMemo(() => {
    if (results.length === 0) return { avgAccuracy: 0, totalQuizzes: 0, totalXp: 0, bestStreak: 0 };
    return {
      avgAccuracy: Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length),
      totalQuizzes: results.length,
      totalXp: results.reduce((sum, r) => sum + r.xpEarned, 0),
      bestStreak: Math.max(...results.map(r => r.streak)),
    };
  }, [results]);

  const subjectStats = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    results.forEach(r => {
      if (!map[r.subject]) map[r.subject] = { correct: 0, total: 0 };
      map[r.subject].correct += r.correctAnswers;
      map[r.subject].total += r.totalQuestions;
    });
    return Object.entries(map).map(([subject, { correct, total }]) => ({
      subject,
      accuracy: Math.round((correct / total) * 100),
      total,
      correct,
      strength: (correct / total) >= 0.8 ? 'strong' as const : (correct / total) >= 0.5 ? 'moderate' as const : 'weak' as const,
    }));
  }, [results]);

  return { results, addResult, stats, subjectStats };
}
