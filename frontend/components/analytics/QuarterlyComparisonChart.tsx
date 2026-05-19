'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { twMerge } from 'tailwind-merge';

interface DataPoint {
  quarter: string;
  planned: number;
  actual: number;
}

interface QuarterlyComparisonChartProps {
  data: DataPoint[];
  className?: string;
}

export function QuarterlyComparisonChart({ data, className }: QuarterlyComparisonChartProps) {
  return (
    <div className={twMerge("w-full h-80", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dx={-10} />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '14px' }} iconType="circle" />
          <Bar dataKey="planned" name="Planned Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
          <Bar dataKey="actual" name="Actual Achievement" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
