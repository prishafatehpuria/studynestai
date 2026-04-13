export interface Task {
  id: string;
  name: string;
  subject: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  goalId?: string;
}

export type UrgencyLevel = 'overdue' | 'urgent' | 'upcoming' | 'relaxed';

export interface Note {
  id: string;
  subject: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  duration: number;
  date: string;
  type: 'pomodoro' | 'free';
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  subject: string;
  targetDate: string;
  createdAt: string;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'paused';
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  condition: AchievementCondition;
}

export type AchievementCondition =
  | { type: 'tasks_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'study_minutes'; count: number }
  | { type: 'goals_completed'; count: number }
  | { type: 'pomodoro_sessions'; count: number };

export interface GamificationData {
  points: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalTasksCompleted: number;
  totalStudyMinutes: number;
  totalPomodoroSessions: number;
  achievements: string[]; // achievement IDs
}
