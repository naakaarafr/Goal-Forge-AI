'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quarter, QuarterState } from '@/hooks/api/useQuarters';
import { CountdownTimer } from './CountdownTimer';

interface QuarterTimelineProps {
  quarter: Quarter | null | undefined;
  isLoading?: boolean;
}

export const QuarterTimeline: React.FC<QuarterTimelineProps> = ({ quarter, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-1/4 bg-slate-800 rounded mb-4" />
        <div className="h-2 w-full bg-slate-800 rounded mb-4" />
        <div className="flex gap-4">
          <div className="h-10 w-24 bg-slate-800 rounded" />
          <div className="h-10 w-24 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!quarter) {
    return (
      <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 text-center text-slate-500 font-medium">
        No active quarter data found.
      </div>
    );
  }

  const phases = [
    {
      state: QuarterState.PLANNING,
      title: 'Planning',
      desc: 'Goal Setting & Submission',
      badge: 'planning',
    },
    {
      state: QuarterState.ACTIVE,
      title: 'Active Tracking',
      desc: 'Check-ins & Execution',
      badge: 'active',
    },
    {
      state: QuarterState.REVIEW,
      title: 'Review Phase',
      desc: 'Manager Review & Scoring',
      badge: 'review',
    },
    {
      state: QuarterState.CLOSED,
      title: 'Closed',
      desc: 'Archived & Immutable',
      badge: 'archived',
    },
  ];

  // Determine active phase index
  const activeIdx = phases.findIndex(p => p.state === quarter.state);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 to-slate-900/70 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Active Period
            </span>
            {quarter.is_immutable && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                🔒 Immutable
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Quarterly Roadmap: <span className="text-indigo-400 font-extrabold">{quarter.label}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
            Timeline duration: <span className="text-slate-300 font-semibold">{formatDate(quarter.start_date)}</span> to{' '}
            <span className="text-slate-300 font-semibold">{formatDate(quarter.end_date)}</span>
          </p>
        </div>

        {/* Real-time countdown to the end of the active quarter phase */}
        {!quarter.is_immutable && (
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 md:px-4 md:py-3 self-start lg:self-auto min-w-[210px]">
            <CountdownTimer endDateStr={quarter.end_date} label="Phase Deadline Countdown" />
          </div>
        )}
      </div>

      {/* Responsive Horizontal / Vertical timeline */}
      <div className="relative mt-8 mb-4">
        {/* Connection line for Desktop */}
        <div className="hidden md:block absolute top-[14px] left-[5%] right-[5%] h-0.5 bg-slate-800" />
        
        {/* Active connection line overlay */}
        {activeIdx > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(activeIdx / (phases.length - 1)) * 90}%` }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="hidden md:block absolute top-[14px] left-[5%] h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
          {phases.map((phase, idx) => {
            const isCompleted = idx < activeIdx;
            const isActive = idx === activeIdx;
            const isUpcoming = idx > activeIdx;

            return (
              <div key={phase.state} className="flex md:flex-col gap-4 md:gap-0 md:items-center">
                {/* Node Icon/Indicator */}
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 relative transition-all duration-300 ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]'
                        : isCompleted
                        ? 'bg-slate-950 border-indigo-500 text-indigo-400'
                        : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}

                    {/* Active pulse highlight */}
                    {isActive && (
                      <span className="absolute -inset-1 rounded-full border border-indigo-400/40 animate-ping pointer-events-none" />
                    )}
                  </motion.div>
                  
                  {/* Connection line for Mobile */}
                  {idx < phases.length - 1 && (
                    <div className={`md:hidden w-0.5 h-10 mt-2 ${isCompleted ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                  )}
                </div>

                {/* Node Text Content */}
                <div className="flex-1 md:text-center md:mt-3">
                  <h3
                    className={`text-sm font-bold tracking-tight transition-colors duration-300 ${
                      isActive ? 'text-indigo-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {phase.title}
                  </h3>
                  <p className="text-[11px] md:text-xs text-slate-400 font-medium mt-0.5 max-w-[160px] md:mx-auto">
                    {phase.desc}
                  </p>
                  
                  {/* Active Indicator Badge */}
                  {isActive && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase rounded tracking-wider">
                      Current
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-500 text-[10px] font-bold uppercase rounded tracking-wider">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
