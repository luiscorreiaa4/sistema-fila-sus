import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
  danger: 'bg-red-50 text-red-700 border-red-200/70',
  info: 'bg-[#EFF4FB] text-[#1E6BFF] border-[#DBEAFE]',
  neutral: 'bg-slate-100 text-[#64748B] border-slate-200/80',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-[#1E6BFF]',
  neutral: 'bg-[#64748B]',
};

export function StatusBadge({
  tone = 'neutral',
  dot = false,
  pulse = false,
  children,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-tight ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
}
