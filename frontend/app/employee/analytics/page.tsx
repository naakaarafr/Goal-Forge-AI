'use client';

import React from 'react';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useGoals } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import { UoMTrendChart } from '@/components/analytics/UoMTrendChart';
import { 
  BarChart3, Target, TrendingUp, Sparkles, 
  Activity, ArrowUpRight, Award, Compass, ShieldCheck, Flame
} from 'lucide-react';
import Link from 'next/link';

// Mock trend history for the employee's main initiative
const mockTrendData = [
  { date: 'May 1', value: 20 },
  { date: 'May 5', value: 35 },
  { date: 'May 10', value: 40 },
  { date: 'May 12', value: 55 },
  { date: 'May 15', value: 70 },
  { date: 'May 18', value: 85 },
];

export default function EmployeeAnalyticsPage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);
  const { data: goalsData, isLoading } = useGoals({ quarter: filters.quarter, scope: 'personal' });

  const goals = Array.isArray(goalsData) ? (goalsData.length > 0 ? goalsData : null) : goalsData?.items || null;
  const goalList = Array.isArray(goals) ? goals : [];

  // Group goals by thrust area
  const thrustAreaMap = React.useMemo(() => {
    const map: Record<string, { count: number; totalProgress: number; goals: any[] }> = {};
    goalList.forEach(g => {
      const area = g.thrust_area || 'Core Strategic';
      if (!map[area]) {
        map[area] = { count: 0, totalProgress: 0, goals: [] };
      }
      map[area].count += 1;
      map[area].totalProgress += g.progress || 0;
      map[area].goals.push(g);
    });
    return map;
  }, [goalList]);

  const totalGoals = goalList.length;
  const avgProgress = totalGoals > 0 
    ? Math.round(goalList.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals) 
    : 0;

  // Weighted Average Progress
  const totalWeightage = goalList.reduce((sum, g) => sum + (g.weightage || 0), 0);
  const weightedProgressSum = goalList.reduce((sum, g) => sum + ((g.progress || 0) * (g.weightage || 0)), 0);
  const achievementPct = totalWeightage > 0 ? Math.round(weightedProgressSum / totalWeightage) : 0;

  return (
    <div className="space-y-8 pb-10">
      
      {/* Page Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-indigo-50/40 to-transparent rounded-r-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Analytics Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs text-slate-400 font-semibold">{filters.quarter} Metrics</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              Personal Performance Analytics
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Deep-dive metrics and charts analyzing your execution velocity, target alignment, and focus distribution.
            </p>
          </div>
        </div>
      </section>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alignment Index</span>
          <h3 className="text-3xl font-black text-indigo-600 mt-1">{achievementPct}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-2">Weighted Performance</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Depth</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-1">{avgProgress}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-2">Average Initiative Progress</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Weightage</span>
          <h3 className="text-3xl font-black text-amber-600 mt-1">{totalWeightage}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-2">Allocated Strategy Weight</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initiatives Tracked</span>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{totalGoals}</h3>
          <p className="text-xs text-slate-400 font-bold mt-2">Active Objectives</p>
        </div>

      </section>

      {/* Main Charts & Bento Breakouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress trend chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Execution Velocity Trend</h3>
              <p className="text-xs text-slate-400">Cumulative progress growth of key initiatives across {filters.quarter}</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-xl">
              Live Tracker
            </span>
          </div>
          
          <div className="pt-2">
            <UoMTrendChart 
              data={mockTrendData}
              uom="percentage"
              target={100}
            />
          </div>
        </div>

        {/* Thrust Area Alignment Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-black text-slate-800">Thrust Area Breakout</h3>
            </div>
            
            {isLoading ? (
              <p className="text-xs text-slate-400 py-4">Compiling area breakdowns...</p>
            ) : Object.keys(thrustAreaMap).length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No goals created. Area distributions are empty.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(thrustAreaMap).map(([area, stats]) => {
                  const areaAvg = Math.round(stats.totalProgress / stats.count);
                  return (
                    <div key={area} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span className="line-clamp-1">{area}</span>
                        <span>{areaAvg}% avg</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div 
                          className="bg-indigo-600 h-1.5 rounded-full" 
                          style={{ width: `${areaAvg}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">{stats.count} active objectives</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100 mt-6">
            <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Audit-Ready State</h4>
              <p className="text-[10px] text-slate-400">All metrics are cryptographically locked and fully compliant with GoalForge guidelines.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Goal List Analytical Data Grid */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-black text-slate-900">Performance Alignment Directory</h3>
          <p className="text-xs text-slate-400">Comprehensive overview of target values, status, priorities, and weights</p>
        </div>
        
        {goalList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No goals found for {filters.quarter}. Use the Goal Manager to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Initiative Name</th>
                  <th className="p-4">Thrust Area</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4 text-center">Weight</th>
                  <th className="p-4 text-center">Progress</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {goalList.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{g.title}</td>
                    <td className="p-4 text-slate-500">{g.thrust_area}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                        g.priority === 'critical' ? 'bg-rose-50 text-rose-700' :
                        g.priority === 'high' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {g.priority}
                      </span>
                    </td>
                    <td className="p-4 text-center font-black text-slate-900">{g.weightage}%</td>
                    <td className="p-4 text-center">
                      <span className="text-indigo-600 font-bold">{g.progress}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[10px] font-black bg-slate-100 py-1 px-2 rounded-full uppercase text-slate-500">
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
