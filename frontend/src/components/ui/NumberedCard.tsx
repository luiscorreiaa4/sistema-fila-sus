import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NumberedCardProps {
  index: number;
  icon: ReactNode;
  title: string;
  description?: string | null;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  rightMeta?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function NumberedCard({
  index,
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  rightMeta,
  badge,
  children,
  className = '',
}: NumberedCardProps) {
  const numero = String(index).padStart(2, '0');

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-[20px] bg-white border border-[#E2E8F0] p-6 transition-all duration-200 hover:border-[#1E6BFF]/35 hover:shadow-soft ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-4xl font-light tracking-tight text-[#DBEAFE] select-none leading-none">
            {numero}
          </span>
          {badge}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FB] text-[#1E6BFF]">
            {icon}
          </div>
          <h3 className="font-display text-lg font-medium text-[#0F172A] leading-snug">
            {title}
          </h3>
        </div>

        {description && (
          <p className="mt-3 text-sm text-[#64748B] leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}
      </div>

      {(actionLabel || rightMeta) && (
        <div className="mt-6 pt-4 border-t border-[#E2E8F0]/70 flex items-center justify-between gap-3">
          {actionLabel ? (
            actionTo ? (
              <Link
                to={actionTo}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E6BFF] hover:text-[#1554D9] transition-colors"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E6BFF] hover:text-[#1554D9] transition-colors"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )
          ) : (
            <span />
          )}

          {rightMeta && (
            <div className="text-xs text-[#64748B] text-right">{rightMeta}</div>
          )}
        </div>
      )}
    </article>
  );
}
