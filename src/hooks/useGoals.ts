import { useState, useCallback, useMemo } from 'react';
import { Goal, Milestone } from '@/types/task';

const STORAGE_KEY = 'study-planner-goals';

function loadGoals(): Goal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals);

  const update = useCallback((newGoals: Goal[]) => {
    setGoals(newGoals);
    saveGoals(newGoals);
  }, []);

  const addGoal = useCallback((title: string, description: string, subject: string, targetDate: string, milestones: string[]) => {
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      targetDate,
      createdAt: new Date().toISOString(),
      status: 'active',
      milestones: milestones.map(m => ({
        id: crypto.randomUUID(),
        title: m.trim(),
        completed: false,
      })),
    };
    update([...loadGoals(), goal]);
  }, [update]);

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    update(loadGoals().map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const allDone = milestones.every(m => m.completed);
      return { ...g, milestones, status: allDone ? 'completed' as const : g.status };
    }));
  }, [update]);

  const deleteGoal = useCallback((id: string) => {
    update(loadGoals().filter(g => g.id !== id));
  }, [update]);

  const updateGoalStatus = useCallback((id: string, status: Goal['status']) => {
    update(loadGoals().map(g => g.id === id ? { ...g, status } : g));
  }, [update]);

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);

  const getGoalProgress = useCallback((goal: Goal) => {
    if (goal.milestones.length === 0) return 0;
    return Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100);
  }, []);

  return { goals, activeGoals, completedGoals, addGoal, toggleMilestone, deleteGoal, updateGoalStatus, getGoalProgress };
}
