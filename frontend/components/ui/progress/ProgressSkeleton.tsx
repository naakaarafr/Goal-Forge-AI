'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

export function ProgressSkeleton({ className, type = 'linear' }: { className?: string, type?: 'linear' | 'radial' }) {
  if (type === 'radial') {
    return (
      <div className={twMerge("w-32 h-32 rounded-full border-8 border-slate-100 animate-pulse bg-slate-50", className)} />
    );
  }
  
  return (
    <div className={twMerge("w-full h-2.5 bg-slate-100 rounded-full overflow-hidden", className)}>
      <div className="w-full h-full bg-slate-200 animate-pulse rounded-full" />
    </div>
  );
}
