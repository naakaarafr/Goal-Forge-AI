'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  endDateStr: string;
  label?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endDateStr, label = 'Time Remaining' }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endDateStr) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDateStr]);

  const { days, hours, minutes, seconds, isExpired } = timeLeft;
  const isUrgent = !isExpired && days === 0 && hours < 48; // Less than 48 hours remaining

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-semibold text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Period Expired
      </div>
    );
  }

  const timeBlocks = [
    { label: 'days', value: days },
    { label: 'hrs', value: hours },
    { label: 'mins', value: minutes },
    { label: 'secs', value: seconds },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 uppercase">
        <span>{label}</span>
        {isUrgent && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-amber-400 flex items-center gap-1 font-bold lowercase text-[11px]"
          >
            ⚠️ deadline approaching
          </motion.span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {timeBlocks.map((block, idx) => (
          <div key={block.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`relative px-2.5 py-1.5 rounded-lg border text-sm font-bold min-w-[38px] text-center shadow-sm transition-all duration-300 ${
                  isUrgent
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-500/5'
                    : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300'
                }`}
              >
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={block.value}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="block"
                  >
                    {String(block.value).padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wide">
                {block.label}
              </span>
            </div>
            {idx < timeBlocks.length - 1 && (
              <span className={`text-lg font-extrabold mx-1 mb-5 transition-colors ${isUrgent ? 'text-amber-500/40' : 'text-indigo-500/20'}`}>
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
