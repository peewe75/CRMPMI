import { cn } from '@/lib/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-accent',
        className
      )}
    />
  );
}
