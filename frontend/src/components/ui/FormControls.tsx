import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-[#0F172A] tracking-tight"
      >
        {label}
        {required && <span className="ml-1 text-[#1E6BFF]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[#64748B]">{hint}</p>
      ) : null}
    </div>
  );
}

const BASE_INPUT_CLASS =
  'w-full min-w-0 max-w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#64748B]/70 transition-colors focus:border-[#1E6BFF] focus:outline-none focus:ring-2 focus:ring-[#1E6BFF]/15 disabled:bg-[#F4F7FC] disabled:text-[#64748B]';

const ERROR_INPUT_CLASS =
  'border-red-500 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20';

export function TextInput({
  className = '',
  hasError = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      className={`${BASE_INPUT_CLASS} ${
        hasError ? ERROR_INPUT_CLASS : ''
      } ${className}`}
      {...props}
    />
  );
}

export function SelectInput({
  className = '',
  hasError = false,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <select
      className={`${BASE_INPUT_CLASS} ${
        hasError ? ERROR_INPUT_CLASS : ''
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextAreaInput({
  className = '',
  hasError = false,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  return (
    <textarea
      className={`${BASE_INPUT_CLASS} min-h-[84px] resize-y ${
        hasError ? ERROR_INPUT_CLASS : ''
      } ${className}`}
      {...props}
    />
  );
}
