import { useState, useCallback, useMemo } from 'react';
import { GamificationData, Achievement, AchievementCondition } from '@/types/task';

const STORAGE_KEY = 'study-planner-gamification';

const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_task', title: 'First Step', description: 'Complete your first task', icon: '🎯', condition: { type: 'tasks_completed', count: 1 } },
  { id: 'task_10', title: 'Getting Momentum', description: 'Complete 10 tasks', icon: '🚀', condition: { type: 'tasks_completed', count: 10 } },
  { id: 'task_25', title: 'Task Master', description: 'Complete 25 tasks', icon: '⚡', condition: { type: 'tasks_completed', count: 25 } },
  { id: 'task_50', title: 'Unstoppable', description: 'Complete 50 tasks', icon: '🔥', condition: { type: 'tasks_completed', count: 50 } },
  { id: 'task_100', title: 'Centurion', description: 'Complete 100 tasks', icon: '💯', condition: { type: 'tasks_completed', count: 100 } },
  { id: 'streak_3', title: 'Three-peat', description: '3-day study streak', icon: '📅', condition: { type: 'streak_days', count: 3 } },
  { id: 'streak_7', title: 'Week Warrior', description: '7-day study streak', icon: '🗓️', condition: { type: 'streak_days', count: 7 } },
  { id: 'streak_14', title: 'Fortnight Focus', description: '14-day study streak', icon: '💪', condition: { type: 'streak_days', count: 14 } },
  { id: 'streak_30', title: 'Monthly Master', description: '30-day study streak', icon: '👑', condition: { type: 'streak_days', count: 30 } },
  { id: 'study_60', title: 'Hour of Power', description: 'Study for 60 minutes total', icon: '⏱️', condition: { type: 'study_minutes', count: 60 } },
  { id: 'study_300', title: 'Deep Diver', description: 'Study for 5 hours total', icon: '🧠', condition: { type: 'study_minutes', count: 300 } },
  { id: 'study_1000', title: 'Scholar', description: 'Study for 1000 minutes total', icon: '📚', condition: { type: 'study_minutes', count: 1000 } },
  { id: 'pomodoro_5', title: 'Focused Five', description: 'Complete 5 Pomodoro sessions', icon: '🍅', condition: { type: 'pomodoro_sessions', count: 5 } },
  { id: 'pomodoro_25', title: 'Pomodoro Pro', description: 'Complete 25 Pomodoro sessions', icon: '🏆', condition: { type: 'pomodoro_sessions', count: 25 } },
  { id: 'goal_1', title: 'Goal Getter', description: 'Complete your first goal', icon: '🎖️', condition: { type: 'goals_completed', count: 1 } },
];

const defaultData: GamificationData = {
  points: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  totalTasksCompleted: 0,
  totalStudyMinutes: 0,
  totalPomodoroSessions: 0,
  achievements: [],
};

function loadData(): GamificationData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...defaultData, ...JSON.parse(data) } : { ...defaultData };
  } catch {
    return { ...defaultData };
  }
}

function saveData(data: GamificationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLevel(points: number): number {
  return Math.floor(points / 100) + 1;
}

function getPointsForNextLevel(level: number): number {
  return level * 100;
}

export function useGamification() {
  const [data, setData] = useState<GamificationData>(loadData);

  const update = useCallback((updater: (prev: GamificationData) => GamificationData) => {
    setData(prev => {
      const next = updater(prev);
      next.level = getLevel(next.points);
      saveData(next);
      return next;
    });
  }, []);

  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    update(prev => {
      if (prev.lastActiveDate === today) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = prev.lastActiveDate === yesterdayStr ? prev.currentStreak + 1 : 1;
      return {
        ...prev,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastActiveDate: today,
      };
    });
  }, [update]);

  const addPoints = useCallback((amount: number, reason: 'task' | 'pomodoro' | 'goal') => {
    updateStreak();
    update(prev => {
      const next = { ...prev, points: prev.points + amount };
      if (reason === 'task') next.totalTasksCompleted += 1;
      if (reason === 'pomodoro') {
        next.totalPomodoroSessions += 1;
        next.totalStudyMinutes += 25;
      }
      if (reason === 'goal') next.totalTasksCompleted = prev.totalTasksCompleted; // no change
      // Check achievements
      const newAchievements = [...next.achievements];
      ACHIEVEMENTS_LIST.forEach(a => {
        if (newAchievements.includes(a.id)) return;
        if (checkCondition(a.condition, next)) {
          newAchievements.push(a.id);
        }
      });
      next.achievements = newAchievements;
      return next;
    });
  }, [update, updateStreak]);

  const addStudyMinutes = useCallback((minutes: number) => {
    update(prev => ({
      ...prev,
      totalStudyMinutes: prev.totalStudyMinutes + minutes,
    }));
  }, [update]);

  const achievements = useMemo(() => {
    return ACHIEVEMENTS_LIST.map(a => ({
      ...a,
      unlocked: data.achievements.includes(a.id),
    }));
  }, [data.achievements]);

  const pointsToNextLevel = getPointsForNextLevel(data.level) - data.points;
  const levelProgress = ((data.points % 100) / 100) * 100;

  return {
    data,
    addPoints,
    addStudyMinutes,
    updateStreak,
    achievements,
    pointsToNextLevel,
    levelProgress,
    POINT_VALUES: { task_low: 5, task_medium: 10, task_high: 20, pomodoro: 15, goal: 50 },
  };
}

function checkCondition(condition: AchievementCondition, data: GamificationData): boolean {
  switch (condition.type) {
    case 'tasks_completed': return data.totalTasksCompleted >= condition.count;
    case 'streak_days': return data.currentStreak >= condition.count;
    case 'study_minutes': return data.totalStudyMinutes >= condition.count;
    case 'goals_completed': return false; // handled externally
    case 'pomodoro_sessions': return data.totalPomodoroSessions >= condition.count;
  }
}
