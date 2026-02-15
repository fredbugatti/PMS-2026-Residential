import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, containerClassName = '', className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputStyles = 'w-full rounded-lg px-3 py-2.5 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

    const inputStateStyles = error
      ? 'border-2 border-red-600 bg-white text-slate-900'
      : 'border border-slate-300 bg-white text-slate-900 hover:border-slate-400';

    const combinedInputClassName = `${baseInputStyles} ${inputStateStyles} ${className}`.trim();

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={combinedInputClassName}
          {...props}
        />

        {error && (
          <div className="mt-1 flex items-start gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && helperText && (
          <p className="mt-1 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
