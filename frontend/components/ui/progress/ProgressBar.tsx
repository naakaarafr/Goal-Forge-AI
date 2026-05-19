'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface ProgressBarProps {
  progress: number; // 0 to 100
  uom?: string; // 'numeric_min', 'numeric_max', etc
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
}

export function ProgressBar({ progress, uom = 'numeric_min', className, barClassName, showLabel = false }: ProgressBarProps) {
  // Determine color based on UoM and progress
  let colorClass = 'bg-primary';
  
  if (uom.includes('max')) {
    if (progress >= 100) colorClass = 'bg-green-500';
    else if (progress >= 50) colorClass = 'bg-amber-500';
    else colorClass = 'bg-red-500';
  } else {
    // Standard min
    if (progress >= 100) colorClass = 'bg-green-500';
    else if (progress >= 50) colorClass = 'bg-primary';
    else colorClass = 'bg-amber-500';
  }

  // Constrain to 0-100 for display width
  const displayWidth = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={twMerge("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</span>
          <span className="text-xs font-black text-slate-900">{progress.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${displayWidth}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={twMerge("h-full rounded-full transition-colors duration-500", colorClass, barClassName)}
        />
      </div>
    </div>
  );
}
