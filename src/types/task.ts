export interface Task {
  id: string;
  name: string;
  subject: string;
  dueDate: string; // ISO date string
  completed: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
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
  duration: number; // minutes
  date: string;
  type: 'pomodoro' | 'free';
}
