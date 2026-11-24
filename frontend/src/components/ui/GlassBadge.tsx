import type { ReactNode } from 'react';

interface GlassBadgeProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function GlassBadge({
  icon,
  title,
  subtitle,
  className = '',
}: GlassBadgeProps) {
  return (
    <div
      className={`glass-badge flex w-full min-w-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-soft ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#0F172A] leading-snug break-words">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[#64748B] leading-snug break-words">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
