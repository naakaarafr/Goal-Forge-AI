'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { twMerge } from 'tailwind-merge';

interface TrendData {
  date: string;
  value: number;
}

interface UoMTrendChartProps {
  data: TrendData[];
  uom: string;
  className?: string;
  target?: number;
}

export function UoMTrendChart({ data, uom, target, className }: UoMTrendChartProps) {
  const isPercentage = uom.includes('percentage');
  const isMax = uom.includes('max'); // Lower is better
  
  const formatYAxis = (tickItem: number) => {
    return isPercentage ? `${tickItem}%` : tickItem.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
          <p className="text-sm font-bold text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-black text-primary">
            {payload[0].value}
            {isPercentage && <span className="text-sm ml-1">%</span>}
          </p>
          {target !== undefined && (
            <p className="text-xs font-bold text-slate-400 mt-2">Target: {target}{isPercentage ? '%' : ''}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={twMerge("w-full h-64", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isMax ? "#ef4444" : "#3b82f6"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isMax ? "#ef4444" : "#3b82f6"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} minTickGap={30} />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
            tickFormatter={formatYAxis}
            reversed={isMax} // Invert Y axis if lower is better
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={isMax ? "#ef4444" : "#3b82f6"} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
