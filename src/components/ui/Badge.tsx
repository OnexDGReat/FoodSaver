import { cn } from '../../lib/utils';
import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'accent' | 'warning' | 'success' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent text-white',
    warning: 'bg-red-500 text-white',
    success: 'bg-green-100 text-green-700',
    outline: 'border border-gray-200 text-gray-500',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
