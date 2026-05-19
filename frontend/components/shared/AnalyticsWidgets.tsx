'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { LucideIcon } from 'lucide-react';

// ─── StatBadge ────────────────────────────────────────────────────────────────

export interface StatBadgeProps {
  value: string | number;
  label: string;
  intent?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
}

const statBadgeIntents = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-rose-50 text-rose-700',
  info:    'bg-blue-50 text-blue-700',
  primary: 'bg-indigo-50 text-indigo-700',
};

/**
 * StatBadge — small inline numeric badge, used inside cards and table cells.
 *
 * @example
 * <StatBadge value="87%" label="Progress" intent="success" />
 */
export function StatBadge({ value, label, intent = 'default', className }: StatBadgeProps) {
  return (
    <div className={twMerge('inline-flex flex-col items-center rounded-xl px-3 py-2 text-center', statBadgeIntents[intent], className)}>
      <span className="text-lg font-black leading-none">{value}</span>
      <span className="text-[10px] font-bold opacity-70 mt-0.5 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── DistributionBar ─────────────────────────────────────────────────────────

export interface DistributionBarProps {
  label: string;
  count: number;
  total: number;
  /** Tailwind bg color class */
  barColor?: string;
  /** Tailwind text color class */
  textColor?: string;
  className?: string;
}

/**
 * DistributionBar — single labelled distribution row used in analytics breakdowns.
 *
 * @example
 * <DistributionBar label="Approved" count={42} total={100} barColor="bg-emerald-500" textColor="text-emerald-700" />
 */
export function DistributionBar({
  label,
  count,
  total,
  barColor = 'bg-indigo-500',
  textColor = 'text-indigo-700',
  className,
}: DistributionBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={twMerge('space-y-1', className)}>
      <div className="flex justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span className={textColor}>{count} <span className="text-slate-400 font-semibold">({pct}%)</span></span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className={twMerge('h-1.5 rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── HealthBuckets ────────────────────────────────────────────────────────────

export interface HealthBucketsProps {
  items: Array<{
    label: string;
    count: number;
    barColor: string;
    textColor: string;
  }>;
  total: number;
  title?: string;
  className?: string;
}

/**
 * HealthBuckets — stacked distribution bars for team/org health breakdowns.
 *
 * @example
 * <HealthBuckets
 *   title="Team Health"
 *   total={teamMembers.length}
 *   items={[
 *     { label: 'On Track (≥70%)', count: 8, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
 *     { label: 'Lagging (40–69%)', count: 3, barColor: 'bg-amber-500', textColor: 'text-amber-700' },
 *     { label: 'At Risk (<40%)', count: 2, barColor: 'bg-rose-500', textColor: 'text-rose-700' },
 *   ]}
 * />
 */
export function HealthBuckets({ items, total, title, className }: HealthBucketsProps) {
  return (
    <div className={twMerge('space-y-3', className)}>
      {title && (
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h4>
      )}
      {items.map((item, i) => (
        <DistributionBar
          key={i}
          label={item.label}
          count={item.count}
          total={total}
          barColor={item.barColor}
          textColor={item.textColor}
        />
      ))}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

/**
 * SectionHeader — consistent sub-section label used inside cards and panels.
 *
 * @example
 * <SectionHeader label="Goal Progress" icon={Target} />
 */
export function SectionHeader({
  label,
  icon: Icon,
  action,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge('flex items-center justify-between', className)}>
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
        {label}
      </h3>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────────────────

const roleBadgeConfig: Record<string, string> = {
  admin:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  manager:  'bg-blue-100 text-blue-700 border-blue-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * RoleBadge — colour-coded role pill, consistent across all portals.
 *
 * @example
 * <RoleBadge role="manager" />
 */
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span className={twMerge(
      'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border',
      roleBadgeConfig[role] ?? 'bg-slate-100 text-slate-600 border-slate-200',
      className
    )}>
      {role}
    </span>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const statusBadgeConfig: Record<string, string> = {
  draft:       'bg-slate-100 text-slate-600',
  submitted:   'bg-blue-50 text-blue-700',
  approved:    'bg-emerald-50 text-emerald-700',
  rejected:    'bg-rose-50 text-rose-700',
  locked:      'bg-indigo-50 text-indigo-700',
  on_track:    'bg-emerald-50 text-emerald-700',
  not_started: 'bg-slate-100 text-slate-500',
  completed:   'bg-emerald-100 text-emerald-800',
  active:      'bg-emerald-50 text-emerald-700',
  planning:    'bg-blue-50 text-blue-700',
  review:      'bg-amber-50 text-amber-700',
  closed:      'bg-slate-100 text-slate-500',
  open:        'bg-rose-50 text-rose-700',
  pending:     'bg-amber-50 text-amber-700',
  resolved:    'bg-emerald-50 text-emerald-700',
};

/**
 * StatusBadge — semantic status pill consistent across goal, quarter, and escalation statuses.
 *
 * @example
 * <StatusBadge status="approved" />
 * <StatusBadge status="at_risk" label="At Risk" />
 */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span className={twMerge(
      'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg',
      statusBadgeConfig[status] ?? 'bg-slate-100 text-slate-600',
      className
    )}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── AvatarInitial ────────────────────────────────────────────────────────────

/**
 * AvatarInitial — colour-gradient avatar showing first initial of a name.
 *
 * @example
 * <AvatarInitial name="Divvyansh Kudesiaa" size="md" />
 */
export function AvatarInitial({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={twMerge(
      'rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center flex-shrink-0 shadow-sm',
      sizes[size],
      className
    )}>
      {name?.charAt(0).toUpperCase() ?? '?'}
    </div>
  );
}
