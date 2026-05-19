'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Loader2, SearchX, AlertCircle, LucideIcon, Inbox } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

/**
 * EmptyState — standardised placeholder for empty data sets.
 *
 * @example
 * <EmptyState
 *   title="No goals configured"
 *   description="Create your first goal to get started."
 *   icon={Target}
 *   action={<Button>Create Goal</Button>}
 * />
 */
export function EmptyState({
  title = 'No data found',
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={twMerge('flex flex-col items-center justify-center text-center px-6 py-12 space-y-3', className)}>
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-1">
        <Icon className="w-7 h-7 text-slate-300" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-slate-700">{title}</p>
        {description && <p className="text-xs text-slate-400 font-semibold max-w-xs">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

/**
 * ErrorState — standardised error placeholder.
 */
export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={twMerge('flex flex-col items-center justify-center text-center px-6 py-12 space-y-3', className)}>
      <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-1">
        <AlertCircle className="w-7 h-7 text-rose-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-slate-700">Request Failed</p>
        <p className="text-xs text-slate-400 font-semibold max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold text-indigo-600 hover:underline mt-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

/**
 * LoadingState — standardised full-area loading indicator.
 */
export function LoadingState({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={twMerge('flex items-center justify-center gap-3 text-slate-400', className)}>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

// ─── SkeletonBlock ────────────────────────────────────────────────────────────

/**
 * SkeletonBlock — generic animated placeholder for loading skeletons.
 *
 * @example
 * <SkeletonBlock className="h-10 w-40 rounded-xl" />
 */
export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={twMerge('bg-slate-100 animate-pulse rounded-xl', className)} />
  );
}

// ─── KpiSkeleton ─────────────────────────────────────────────────────────────

/**
 * KpiSkeleton — skeleton placeholder matching a KpiCard's visual footprint.
 */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
          </div>
          <SkeletonBlock className="h-8 w-20" />
          <SkeletonBlock className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </>
  );
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

/**
 * TableSkeleton — animated placeholder rows for table loading states.
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="grid gap-4 px-4 py-3 border-b border-slate-100" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 rounded-md" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 px-4 py-4 border-b border-slate-50" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className={twMerge('h-4 rounded-md', c === 0 ? 'w-3/4' : '')} />
          ))}
        </div>
      ))}
    </div>
  );
}
