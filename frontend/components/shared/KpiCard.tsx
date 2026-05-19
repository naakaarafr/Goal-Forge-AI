'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiCardProps {
  /** Primary metric label shown above the value */
  label: string;
  /** The main value to display — string or number */
  value: string | number;
  /** Secondary descriptor below the value */
  sub?: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Semantic color intent */
  intent?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  /** Optional progress bar beneath the value (0–100) */
  progress?: number;
  /** Optional trend indicator */
  trend?: { value: number; label?: string };
  /** Optional click handler */
  onClick?: () => void;
  className?: string;
  /** Compact variant for dense grids */
  size?: 'default' | 'compact';
}

// ─── Intent Config ────────────────────────────────────────────────────────────

const intentConfig = {
  default: { icon: 'bg-slate-100 text-slate-600', text: 'text-slate-900', bar: 'bg-slate-500', badge: 'bg-slate-50' },
  primary: { icon: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-700', bar: 'bg-indigo-600', badge: 'bg-indigo-50' },
  success: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-50' },
  warning: { icon: 'bg-amber-50 text-amber-600', text: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-50' },
  danger:  { icon: 'bg-rose-50 text-rose-600', text: 'text-rose-700', bar: 'bg-rose-500', badge: 'bg-rose-50' },
  info:    { icon: 'bg-blue-50 text-blue-600', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-50' },
  purple:  { icon: 'bg-violet-50 text-violet-600', text: 'text-violet-700', bar: 'bg-violet-500', badge: 'bg-violet-50' },
} as const;

// ─── KpiCard ─────────────────────────────────────────────────────────────────

/**
 * KpiCard — Enterprise-grade metric card used across all portals.
 *
 * @example
 * <KpiCard
 *   label="Team Velocity"
 *   value="87%"
 *   sub="Avg Progress"
 *   icon={TrendingUp}
 *   intent="success"
 *   progress={87}
 *   trend={{ value: 4, label: 'vs last quarter' }}
 * />
 */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  intent = 'default',
  progress,
  trend,
  onClick,
  className,
  size = 'default',
}: KpiCardProps) {
  const cfg = intentConfig[intent];
  const isCompact = size === 'compact';
  const Wrapper = onClick ? 'button' : 'div';

  const trendPositive = trend && trend.value > 0;
  const trendNeutral  = trend && trend.value === 0;
  const TrendIcon = trendPositive ? TrendingUp : trendNeutral ? Minus : TrendingDown;
  const trendColor  = trendPositive ? 'text-emerald-600' : trendNeutral ? 'text-slate-400' : 'text-rose-600';

  return (
    <Wrapper
      onClick={onClick}
      className={twMerge(
        'bg-white rounded-3xl border border-slate-100 shadow-sm transition-all group',
        isCompact ? 'p-4' : 'p-5',
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 active:scale-[0.99]' : 'hover:shadow-md',
        className
      )}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</span>
        {Icon && (
          <div className={twMerge('p-2 rounded-xl group-hover:scale-110 transition-transform', cfg.icon)}>
            <Icon className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </div>
        )}
      </div>

      {/* Value */}
      <p className={twMerge('font-black leading-none', isCompact ? 'text-2xl' : 'text-3xl', cfg.text)}>
        {value}
      </p>

      {/* Sub-label + trend */}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {sub && <p className="text-[10px] text-slate-400 font-bold">{sub}</p>}
        {trend && (
          <span className={twMerge('flex items-center gap-0.5 text-[10px] font-black flex-shrink-0', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {trend.value > 0 && '+'}{trend.value}%
            {trend.label && <span className="text-slate-400 font-semibold ml-1">{trend.label}</span>}
          </span>
        )}
      </div>

      {/* Optional progress bar */}
      {progress !== undefined && (
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
          <div
            className={twMerge('h-1.5 rounded-full transition-all duration-700', cfg.bar)}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </Wrapper>
  );
}

// ─── KpiCardGrid ─────────────────────────────────────────────────────────────

interface KpiCardGridProps {
  children: React.ReactNode;
  /** Column count override — defaults to responsive 1-2-4 */
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const colClass: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

/**
 * KpiCardGrid — Responsive grid container for multiple KpiCards.
 *
 * @example
 * <KpiCardGrid cols={4}>
 *   <KpiCard label="..." value="..." />
 *   ...
 * </KpiCardGrid>
 */
export function KpiCardGrid({ children, cols = 4, className }: KpiCardGridProps) {
  return (
    <div className={twMerge('grid gap-5', colClass[cols], className)}>
      {children}
    </div>
  );
}
