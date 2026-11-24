import type { ReactNode } from 'react';
import { GlassBadge } from '../ui/GlassBadge';

export interface BrandBadgeItem {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

interface BrandVisualPanelProps {
  headline: string;
  description: string;
  badges: [BrandBadgeItem, BrandBadgeItem, BrandBadgeItem];
  className?: string;
}

export function BrandVisualPanel({
  headline,
  description,
  badges,
  className = '',
}: BrandVisualPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[32px] bg-cobalt-gradient p-7 sm:p-9 text-white flex flex-col justify-between min-h-[460px] shadow-cobalt ${className}`}
    >
      {/* Brilhos de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#0A38A3]/50 blur-3xl"
      />

      {/* Ilustração decorativa */}
      <svg
        aria-hidden="true"
        viewBox="0 0 420 280"
        className="pointer-events-none absolute right-0 bottom-8 w-[360px] max-w-none opacity-20"
        fill="none"
      >
        <circle cx="260" cy="140" r="115" stroke="white" strokeWidth="1.5" />
        <circle cx="260" cy="140" r="78" stroke="white" strokeWidth="1.2" strokeDasharray="6 6" />
        <path
          d="M30 165 H140 L165 120 L190 198 L218 92 L244 165 H390"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Cabeçalho superior */}
      <div className="relative z-10 max-w-md">
        <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight leading-[1.12] text-white">
          {headline}
        </h2>
        <p className="mt-3 text-sm text-white/80 leading-relaxed">
          {description}
        </p>
      </div>

      {/* 3 badges */}
      <div className="relative z-10 mt-8 grid grid-cols-1 gap-3">
        <div>
          <GlassBadge
            icon={badges[0].icon}
            title={badges[0].title}
            subtitle={badges[0].subtitle}
          />
        </div>
        <div>
          <GlassBadge
            icon={badges[1].icon}
            title={badges[1].title}
            subtitle={badges[1].subtitle}
          />
        </div>
        <div>
          <GlassBadge
            icon={badges[2].icon}
            title={badges[2].title}
            subtitle={badges[2].subtitle}
          />
        </div>
      </div>
    </div>
  );
}
