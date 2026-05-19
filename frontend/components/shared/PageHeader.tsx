'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Subtitle / description */
  description?: string;
  /** Pill badge shown before the title */
  badge?: { label: string; icon?: LucideIcon; color?: string };
  /** Contextual tag (e.g. active quarter) */
  tag?: string;
  /** Action buttons on the right side */
  actions?: React.ReactNode;
  /** Gradient accent — defaults to indigo */
  accentColor?: 'indigo' | 'blue' | 'rose' | 'amber' | 'emerald' | 'slate' | 'dark';
  className?: string;
}

const accentConfig = {
  indigo:  'from-indigo-50/40',
  blue:    'from-blue-50/40',
  rose:    'from-rose-50/40',
  amber:   'from-amber-50/40',
  emerald: 'from-emerald-50/40',
  slate:   'from-slate-50/60',
  dark:    'from-transparent',
};

const badgeDefault = 'bg-indigo-100 text-indigo-800';

/**
 * PageHeader — standardised portal page header with badge, title, description, tag, and actions.
 * Used consistently across all Employee, Manager, and Admin portal pages.
 *
 * @example
 * <PageHeader
 *   title="Team Analytics"
 *   description="Deep performance metrics across your direct reports."
 *   badge={{ label: 'Manager Portal', icon: BarChart3 }}
 *   tag="2024-Q4"
 *   actions={<button>Refresh</button>}
 * />
 */
export function PageHeader({
  title,
  description,
  badge,
  tag,
  actions,
  accentColor = 'indigo',
  className,
}: PageHeaderProps) {
  const BadgeIcon = badge?.icon;
  const accent = accentConfig[accentColor];

  return (
    <section
      className={twMerge(
        'bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden',
        className
      )}
    >
      {/* Gradient accent overlay */}
      <div
        className={twMerge(
          'absolute right-0 top-0 w-64 h-full bg-gradient-to-l to-transparent rounded-r-3xl -z-10 pointer-events-none',
          accent
        )}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* Badge + tag row */}
          {(badge || tag) && (
            <div className="flex items-center gap-2 mb-2">
              {badge && (
                <span className={twMerge(
                  'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5',
                  badge.color ?? badgeDefault
                )}>
                  {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                  {badge.label}
                </span>
              )}
              {badge && tag && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              {tag && <span className="text-xs text-slate-400 font-semibold">{tag}</span>}
            </div>
          )}

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">{title}</h2>

          {/* Description */}
          {description && (
            <p className="text-sm text-slate-500 font-medium max-w-xl leading-relaxed">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
