import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <Card className={cn("rounded-2xl border border-sky-500/15 shadow-xs hover:shadow-md hover:border-sky-500/30 transition-all overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-3xl font-black font-['Outfit'] tracking-tight text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-semibold",
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-500/15 to-sky-500/15 border border-sky-500/20 p-3.5 shadow-xs">
            <Icon className="h-6 w-6 text-blue-600 dark:text-sky-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
