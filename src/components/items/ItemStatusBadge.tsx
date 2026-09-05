import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/lib/lifecycle';
import { cn } from '@/lib/utils';
import type { ItemStatus } from '@/types';

/**
 * Status is encoded in colour as well as words, so the state of a shelf full of
 * gear reads at a glance rather than requiring the labels to be read one by one.
 */
const STATUS_STYLES: Record<ItemStatus, string> = {
  IN_POSSESSION: 'bg-secondary text-secondary-foreground',
  LOANED: 'bg-primary/15 text-primary border-primary/30',
  IN_REPAIR: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  BROKEN: 'bg-destructive/15 text-destructive border-destructive/30',
  SOLD: 'bg-muted text-muted-foreground',
  LOST: 'bg-muted text-muted-foreground line-through',
};

interface ItemStatusBadgeProps {
  status: ItemStatus;
  /** Renders an overdue warning instead of the plain loaned styling. */
  overdue?: boolean;
  className?: string;
}

export function ItemStatusBadge({ status, overdue = false, className }: ItemStatusBadgeProps) {
  const label = overdue && status === 'LOANED' ? 'Overdue' : STATUS_LABELS[status];
  const style =
    overdue && status === 'LOANED'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : STATUS_STYLES[status];

  return (
    <Badge variant="outline" className={cn('font-medium', style, className)}>
      {label}
    </Badge>
  );
}
