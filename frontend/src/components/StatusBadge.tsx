import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TournamentStatus } from '@/data/tournaments';
import type { MatchStatus } from '@/data/matches';

type Status = TournamentStatus | MatchStatus;

const statusConfig: Record<Status, { label: string; className: string }> = {
  "Draft": { label: "Draft", className: "bg-muted text-muted-foreground" },
  "Registration Open": { label: "Registration Open", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  "Registration Closed": { label: "Registration Closed", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "In Progress": { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Completed": { label: "Completed", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  "Pending": { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "Scheduled": { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
