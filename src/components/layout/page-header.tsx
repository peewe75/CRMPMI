import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  filters,
  className,
}: PageHeaderProps) {
  const titleSection = (
    <div>
      <h1 className="text-xl font-bold">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );

  const backButton = backHref ? (
    <Button asChild variant="ghost" size="sm">
      <Link href={backHref}>
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
    </Button>
  ) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {backButton}

      {action || filters ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {titleSection}
          <div className="flex items-center gap-2">
            {filters}
            {action}
          </div>
        </div>
      ) : (
        titleSection
      )}
    </div>
  );
}
