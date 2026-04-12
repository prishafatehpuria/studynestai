import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Task Manager',
  '/calendar': 'Calendar',
  '/timer': 'Study Timer',
  '/notes': 'Notes',
  '/progress': 'Progress',
};

export function AppHeader() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Study Planner';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
        <User className="h-4 w-4 text-primary" />
      </div>
    </header>
  );
}
