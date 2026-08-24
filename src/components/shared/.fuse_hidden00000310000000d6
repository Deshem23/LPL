import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

// Generic "nothing here" state used across the site (empty category/
// subcategory, no search results, empty search page, etc.) so every one
// of these looks and behaves the same instead of each screen inventing
// its own ad hoc message.
export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {Icon && <Icon className="h-16 w-16 text-muted-foreground mb-4" />}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-md">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button asChild variant="outline" className="mt-4">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
