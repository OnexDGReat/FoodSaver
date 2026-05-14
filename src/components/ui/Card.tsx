import { cn } from '../../lib/utils';
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  key?: string | number;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'bg-white rounded-[var(--radius-card)] shadow-sm border border-gray-100 overflow-hidden',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
