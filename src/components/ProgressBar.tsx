import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

interface Props {
  progress: number;
  total: number;
  completed: number;
}

export function ProgressBar({ progress, total, completed }: Props) {
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-body text-sm">
        <span className="text-muted-foreground">Progress</span>
        <motion.span
          key={progress}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-semibold text-foreground"
        >
          {completed}/{total} tasks · {progress}%
        </motion.span>
      </div>
      <Progress value={progress} className="h-2.5" />
    </div>
  );
}
