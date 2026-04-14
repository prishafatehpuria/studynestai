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

// Flashcard types
export type FlashcardType = 'definition' | 'question' | 'fill_blank';

export interface Flashcard {
  id: string;
  type: FlashcardType;
  front: string;
  back: string;
  subject: string;
  sourceNoteId?: string;
  createdAt: string;
  // Spaced repetition fields
  easeFactor: number;      // SM-2 ease factor (default 2.5)
  interval: number;        // days until next review
  repetitions: number;     // successful reviews in a row
  nextReviewDate: string;  // ISO date
  lastReviewDate?: string;
  mastery: 'new' | 'learning' | 'reviewing' | 'mastered';
}

export interface FlashcardDeck {
  id: string;
  name: string;
  subject: string;
  cards: Flashcard[];
  createdAt: string;
}

// Quiz types
export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];       // for MCQ
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
}

export interface QuizResult {
  id: string;
  date: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  xpEarned: number;
  streak: number;
  timeTaken: number; // seconds
  questions: { questionId: string; userAnswer: string; correct: boolean }[];
}
