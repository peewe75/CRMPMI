import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <Icon className="mb-3 h-12 w-12 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && (
        <Button asChild={!!actionHref} onClick={onAction} variant="outline" className="mt-4">
          {actionHref ? <Link href={actionHref}>{actionLabel}</Link> : <span>{actionLabel}</span>}
        </Button>
      )}
    </div>
  );
}
