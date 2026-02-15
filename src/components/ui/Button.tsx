import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'compact' | 'large';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', loading = false, disabled, className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-500',
    };

    const sizeStyles = {
      default: 'h-10 px-4 text-sm',
      compact: 'h-9 px-3 text-sm',
      large: 'h-12 px-6 text-base',
    };

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={combinedClassName}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
