import type { ReactNode } from 'react';
import { PillButton } from './PillButton';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-[24px] bg-white border border-[#E2E8F0] p-8 sm:p-10 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-medium text-[#0F172A]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[#64748B] leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <div className="mt-6">
          {actionTo ? (
            <PillButton to={actionTo}>{actionLabel}</PillButton>
          ) : (
            <PillButton onClick={onAction}>{actionLabel}</PillButton>
          )}
        </div>
      )}
    </div>
  );
}
