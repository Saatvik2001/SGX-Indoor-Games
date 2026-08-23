import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  "Draft": { label: "Draft", className: "bg-muted text-muted-foreground" },
  "Active": { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "Upcoming": { label: "Upcoming", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "Registration Open": { label: "Registration Open", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  "Registration Closed": { label: "Registration Closed", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "In Progress": { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Ongoing": { label: "Ongoing", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Live": { label: "Live", className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  "Completed": { label: "Completed", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  "Pending": { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "Scheduled": { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Cancelled": { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const safeStatus = status || 'Active';
  const config = statusConfig[safeStatus] || {
    label: safeStatus,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20"
  };

  return (
    <Badge variant="outline" className={cn("font-semibold text-xs px-2.5 py-0.5 rounded-full", config.className, className)}>
      {config.label}
    </Badge>
  );
}
