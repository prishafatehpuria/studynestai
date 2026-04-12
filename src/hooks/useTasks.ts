import { useState, useCallback, useMemo } from 'react';
import { Task, UrgencyLevel } from '@/types/task';

const STORAGE_KEY = 'study-planner-tasks';

function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const tasks = JSON.parse(data) as Task[];
    // migrate old tasks without priority
    return tasks.map(t => ({ ...t, priority: t.priority || 'medium' }));
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function getUrgency(dueDate: string): UrgencyLevel {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'urgent';
  if (diffDays <= 7) return 'upcoming';
  return 'relaxed';
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);

  const update = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
  }, []);

  const addTask = useCallback((name: string, subject: string, dueDate: string, priority: Task['priority'] = 'medium', description?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      name: name.trim(),
      subject: subject.trim(),
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      priority,
      description,
    };
    update([...loadTasks(), task]);
  }, [update]);

  const editTask = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    update(loadTasks().map(t => t.id === id ? { ...t, ...updates } : t));
  }, [update]);

  const toggleComplete = useCallback((id: string) => {
    update(loadTasks().map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [update]);

  const deleteTask = useCallback((id: string) => {
    update(loadTasks().filter(t => t.id !== id));
  }, [update]);

  const activeTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks.length / tasks.length) * 100);
  }, [tasks, completedTasks]);

  const subjects = useMemo(() => {
    return [...new Set(tasks.map(t => t.subject))].sort();
  }, [tasks]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeTasks.filter(t => t.dueDate === today);
  }, [activeTasks]);

  const overdueTasks = useMemo(() => {
    return activeTasks.filter(t => getUrgency(t.dueDate) === 'overdue');
  }, [activeTasks]);

  const upcomingTasks = useMemo(() => {
    return activeTasks
      .filter(t => getUrgency(t.dueDate) !== 'overdue')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [activeTasks]);

  return { tasks, activeTasks, completedTasks, addTask, editTask, toggleComplete, deleteTask, progress, subjects, todayTasks, overdueTasks, upcomingTasks };
}
