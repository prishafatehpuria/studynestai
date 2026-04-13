import { useGamification } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Flame, Star, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Achievements() {
  const { data, achievements, levelProgress, pointsToNextLevel } = useGamification();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Level & Points */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="flex flex-col items-center p-4">
            <Star className="mb-1 h-6 w-6 text-primary" />
            <p className="font-heading text-3xl font-bold">{data.level}</p>
            <p className="font-body text-xs text-muted-foreground">Level</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <Zap className="mb-1 h-6 w-6 text-warning" />
            <p className="font-heading text-2xl font-bold">{data.points}</p>
            <p className="font-body text-xs text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <Flame className="mb-1 h-6 w-6 text-urgent" />
            <p className="font-heading text-2xl font-bold">{data.currentStreak}</p>
            <p className="font-body text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center p-4">
            <Trophy className="mb-1 h-6 w-6 text-success" />
            <p className="font-heading text-2xl font-bold">{achievements.filter(a => a.unlocked).length}</p>
            <p className="font-body text-xs text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between font-body text-sm">
            <span className="text-muted-foreground">Level {data.level} → Level {data.level + 1}</span>
            <span className="font-semibold">{pointsToNextLevel} pts to go</span>
          </div>
          <Progress value={levelProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Streak Info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Flame className="h-4 w-4 text-urgent" /> Study Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div>
              <p className="font-heading text-4xl font-bold">{data.currentStreak}</p>
              <p className="font-body text-sm text-muted-foreground">Current streak</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="font-heading text-4xl font-bold text-muted-foreground">{data.longestStreak}</p>
              <p className="font-body text-sm text-muted-foreground">Longest streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Target className="h-4 w-4" /> Achievement Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {achievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex flex-col items-center rounded-xl border p-4 text-center transition-all",
                  achievement.unlocked
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border bg-muted/30 opacity-50 grayscale"
                )}
              >
                <span className="text-3xl mb-2">{achievement.icon}</span>
                <p className="font-body text-xs font-semibold leading-tight">{achievement.title}</p>
                <p className="mt-1 font-body text-[10px] text-muted-foreground leading-tight">{achievement.description}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
