import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'draft' | 'default';
  size?: 'default' | 'small';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full';

    const sizeStyles = {
      default: 'px-2.5 py-0.5 text-xs',
      small: 'px-2 py-0.5 text-xs',
    };

    const variantStyles = {
      success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
      warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
      error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
      info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    };

    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim();

    return (
      <span ref={ref} className={combinedClassName} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Preset badges for common use cases
export const StatusBadge = ({ status, ...props }: Omit<BadgeProps, 'variant'> & { status: 'ACTIVE' | 'DRAFT' | 'ENDED' | 'TERMINATED' | 'PENDING' | 'CANCELLED' }) => {
  const variantMap = {
    ACTIVE: 'success' as const,
    DRAFT: 'draft' as const,
    ENDED: 'default' as const,
    TERMINATED: 'error' as const,
    PENDING: 'warning' as const,
    CANCELLED: 'default' as const,
  };

  const labelMap = {
    ACTIVE: 'Active',
    DRAFT: 'Draft',
    ENDED: 'Ended',
    TERMINATED: 'Terminated',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled',
  };

  return (
    <Badge variant={variantMap[status]} {...props}>
      {labelMap[status]}
    </Badge>
  );
};

export const PriorityBadge = ({ priority, ...props }: Omit<BadgeProps, 'variant'> & { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' }) => {
  const variantMap = {
    LOW: 'default' as const,
    MEDIUM: 'info' as const,
    HIGH: 'warning' as const,
    EMERGENCY: 'error' as const,
  };

  const labelMap = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    EMERGENCY: 'Emergency',
  };

  return (
    <Badge variant={variantMap[priority]} {...props}>
      {labelMap[priority]}
    </Badge>
  );
};
