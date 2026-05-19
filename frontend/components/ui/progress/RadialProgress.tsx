'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface RadialProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  colorClass?: string;
  showText?: boolean;
}

export function RadialProgress({
  progress,
  size = 120,
  strokeWidth = 12,
  className,
  colorClass = 'text-primary',
  showText = true
}: RadialProgressProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Constrain to 0-100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={twMerge("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-100"
        />
        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          className={colorClass}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: mounted ? strokeDashoffset : circumference }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {mounted ? progress.toFixed(0) : 0}<span className="text-sm text-slate-400">%</span>
          </span>
        </div>
      )}
    </div>
  );
}
