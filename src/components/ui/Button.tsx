import { motion } from 'motion/react';
import { type ButtonHTMLAttributes, type ReactNode, type MouseEventHandler } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'submit' | 'button' | 'reset';
  disabled?: boolean;
}

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95',
    secondary: 'bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95',
    ghost: 'bg-transparent hover:bg-black/5 text-gray-600',
    outline: 'bg-white border-2 border-primary/20 text-primary hover:bg-primary/5 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-2 text-[11px] font-black uppercase tracking-widest',
    md: 'px-6 py-3 font-bold text-sm',
    lg: 'px-8 py-4 text-base font-black uppercase tracking-widest',
    icon: 'p-3',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-[var(--radius-button)] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none overflow-hidden select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
}
