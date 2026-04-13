import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation } from 'react-router-dom';
import { useGamification } from '@/hooks/useGamification';
import { Star, Flame } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Task Manager',
  '/calendar': 'Calendar',
  '/focus': 'Focus Mode',
  '/notes': 'Notes',
  '/progress': 'Analytics',
  '/goals': 'Goals',
  '/achievements': 'Achievements',
};

export function AppHeader() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Study Planner';
  const { data } = useGamification();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1">
          <Flame className="h-3.5 w-3.5 text-urgent" />
          <span className="font-body text-xs font-semibold">{data.currentStreak}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
          <Star className="h-3.5 w-3.5 text-primary" />
          <span className="font-body text-xs font-semibold">Lv {data.level}</span>
        </div>
      </div>
    </header>
  );
}
