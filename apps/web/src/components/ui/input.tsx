'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
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
          className={`
            w-full px-3 py-2 rounded-lg border text-sm
            transition-colors duration-150
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            ${error
              ? 'border-[var(--color-error)] bg-red-50'
              : 'border-[var(--color-border)] bg-white hover:border-slate-400'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
