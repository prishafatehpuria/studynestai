export interface Task {
  id: string;
  name: string;
  subject: string;
  dueDate: string; // ISO date string
  completed: boolean;
  createdAt: string;
}

export type UrgencyLevel = 'overdue' | 'urgent' | 'upcoming' | 'relaxed';
