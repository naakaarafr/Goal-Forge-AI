'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { useUsersAdmin } from '@/hooks/api/useAdmin';
import { useDashboardSummary, useCompletionSummary, useQoQTrends } from '@/hooks/api/useAnalytics';
import { QuarterlyComparisonChart } from '@/components/analytics/QuarterlyComparisonChart';
import { UoMTrendChart } from '@/components/analytics/UoMTrendChart';
import { RadialProgress } from '@/components/ui/progress/RadialProgress';
import {
  BarChart3, Users, TrendingUp, Target, CheckCircle2,
  Activity, Shield, ArrowUpRight, Zap, Building2
} from 'lucide-react';

const mockQoQ = [
  { quarter: '2025-Q2', planned: 85, actual: 79 },
  { quarter: '2025-Q3', planned: 90, actual: 93 },
  { quarter: '2025-Q4', planned: 95, actual: 88 },
  { quarter: '2026-Q1', planned: 100, actual: 95 },
];

const mockVelocity = [
  { date: 'Jan', value: 18 },
  { date: 'Feb', value: 34 },
  { date: 'Mar', value: 47 },
  { date: 'Apr', value: 62 },
  { date: 'May', value: 76 },
  { date: 'Jun', value: 88 },
];

export default function EnterpriseAnalyticsPage() {
  const filters = useAppStore(s => s.filters);

  const { data: allUsers } = useUsersAdmin();
  const { data: summary } = useDashboardSummary();
  const { data: completionData } = useCompletionSummary(
    { quarter: filters.quarter || '2024-Q3' },
    !!filters.quarter
  );
  const { data: qoqData, isLoading: qoqLoading } = useQoQTrends(true);

  const chartData = React.useMemo(() => {
    if (!qoqData || qoqData.length === 0) return mockQoQ;
    return qoqData.map((item: any) => ({
      quarter: item.quarter,
      planned: 100,
      actual: Math.round(item.avg_progress),
    }));
  }, [qoqData]);

  const totalUsers = allUsers?.length ?? summary?.total_users ?? 0;
  const totalGoals = completionData?.total_goals ?? summary?.total_goals ?? 0;
  const avgProgress = Math.round(completionData?.overall_avg_progress ?? summary?.avg_progress ?? 0);
  const weightedScore = Math.round(completionData?.weighted_strategic_achievement ?? 0);
  const completedGoals = completionData?.completed_goals ?? 0;
  const completionRate = Math.round(completionData?.overall_completion_rate ?? 0);

  const statusDist = completionData?.status_distribution ?? {};
  const trackingDist = completionData?.tracking_status_distribution ?? {};

  // Role breakdown
  const roleBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (allUsers ?? []).forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [allUsers]);

  // Employee performance table
  const empStats = (completionData?.employee_stats ?? []).slice(0, 8);
  const mgrStats = (completionData?.manager_stats ?? []).slice(0, 5);

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/40 to-transparent rounded-r-3xl -z-10" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Enterprise Analytics
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> {filters.quarter}
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Enterprise Analytics</h2>
          <p className="text-sm text-slate-500 font-medium max-w-xl">
            Organisation-wide KPIs, completion rates, department analytics, and manager performance benchmarks.
          </p>
        </div>
      </section>

      {/* Primary Enterprise KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users',       value: totalUsers,         color: 'text-slate-800',   bg: 'bg-slate-50',    icon: Users },
          { label: 'Total Goals',       value: totalGoals,         color: 'text-indigo-700',  bg: 'bg-indigo-50',   icon: Target },
          { label: 'Avg Progress',      value: `${avgProgress}%`,  color: 'text-blue-700',    bg: 'bg-blue-50',     icon: TrendingUp },
          { label: 'Completed',         value: completedGoals,     color: 'text-emerald-700', bg: 'bg-emerald-50',  icon: CheckCircle2 },
          { label: 'Completion Rate',   value: `${completionRate}%`, color: 'text-teal-700', bg: 'bg-teal-50',     icon: Activity },
          { label: 'Weighted Score',    value: `${weightedScore}%`, color: 'text-violet-700', bg: 'bg-violet-50',  icon: Shield },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group text-center">
            <div className={`${k.bg} p-2.5 rounded-xl ${k.color} w-fit mx-auto mb-3 group-hover:scale-110 transition-transform`}>
              <k.icon className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{k.label}</p>
          </div>
        ))}
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* QoQ Chart — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Organisation QoQ Achievement</h3>
              <p className="text-xs text-slate-400">Planned target vs. actual delivery across all quarters</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Live Sync
            </span>
          </div>
          {qoqLoading ? <div className="h-72 bg-slate-50 animate-pulse rounded-2xl" /> : <QuarterlyComparisonChart data={chartData} />}
        </div>

        {/* Org Role Distribution + Weighted Score */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-md font-black text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" /> Organisation Composition
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Employees', count: roleBreakdown['employee'] ?? 0, color: 'bg-slate-500' },
                { label: 'Managers',  count: roleBreakdown['manager']  ?? 0, color: 'bg-blue-500' },
                { label: 'Admins',    count: roleBreakdown['admin']    ?? 0, color: 'bg-indigo-600' },
              ].map(r => {
                const pct = totalUsers > 0 ? Math.round((r.count / totalUsers) * 100) : 0;
                return (
                  <div key={r.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{r.label}</span>
                      <span>{r.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div className={`${r.color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weighted Score radial */}
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-4">
            <RadialProgress progress={weightedScore} size={56} strokeWidth={5} showText={false} />
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Weighted Strategic Score</p>
              <p className="text-2xl font-black text-indigo-800">{weightedScore}%</p>
              <p className="text-[10px] text-indigo-600/70 font-semibold">Weighted by goal criticality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Velocity Chart + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Execution velocity */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-md font-black text-slate-800 mb-1">Org Execution Velocity</h3>
          <p className="text-xs text-slate-400 mb-4">Cumulative goal progress momentum over {filters.quarter}</p>
          <UoMTrendChart data={mockVelocity} uom="percentage" target={100} />
        </div>

        {/* Status + Tracking Distributions — 2 cols */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Goal Status Distribution */}
          {Object.keys(statusDist).length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 mb-4">Goal Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(statusDist).map(([status, count]) => {
                  const cfg: Record<string, { label: string; color: string; bar: string }> = {
                    draft:     { label: 'Draft',     color: 'text-slate-600',   bar: 'bg-slate-500' },
                    submitted: { label: 'Submitted', color: 'text-blue-700',    bar: 'bg-blue-500' },
                    approved:  { label: 'Approved',  color: 'text-emerald-700', bar: 'bg-emerald-500' },
                    rejected:  { label: 'Returned',  color: 'text-rose-700',    bar: 'bg-rose-500' },
                    locked:    { label: 'Locked',    color: 'text-indigo-700',  bar: 'bg-indigo-500' },
                  };
                  const s = cfg[status] ?? { label: status, color: 'text-slate-600', bar: 'bg-slate-400' };
                  const pct = totalGoals > 0 ? Math.round(((count as number) / totalGoals) * 100) : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className={`flex justify-between text-xs font-bold ${s.color}`}>
                        <span>{s.label}</span>
                        <span>{count as number} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div className={`${s.bar} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tracking Status Distribution */}
          {Object.keys(trackingDist).length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 mb-4">Tracking Status Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(trackingDist).map(([status, count]) => {
                  const cfg: Record<string, { label: string; color: string; bar: string }> = {
                    not_started: { label: 'Not Started', color: 'text-slate-600',   bar: 'bg-slate-400' },
                    on_track:    { label: 'On Track',    color: 'text-emerald-700', bar: 'bg-emerald-500' },
                    completed:   { label: 'Completed',   color: 'text-indigo-700',  bar: 'bg-indigo-500' },
                  };
                  const s = cfg[status] ?? { label: status, color: 'text-slate-600', bar: 'bg-slate-400' };
                  const total = Object.values(trackingDist).reduce((a: number, b: number) => a + b, 0) || 1;
                  const pct = Math.round(((count as number) / total) * 100);
                  return (
                    <div key={status} className="space-y-1">
                      <div className={`flex justify-between text-xs font-bold ${s.color}`}>
                        <span>{s.label}</span>
                        <span>{count as number} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div className={`${s.bar} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee Performance Table */}
      {empStats.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-900">Employee Performance Directory</h3>
            <p className="text-xs text-slate-400">Organisation-wide employee achievement index for {filters.quarter}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Employee</th>
                  <th className="p-4 text-center">Goals</th>
                  <th className="p-4 text-center">Completed</th>
                  <th className="p-4 text-center">Avg Progress</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {empStats.map((emp: any) => {
                  const avg = Math.round(emp.average_progress ?? 0);
                  const risk = avg < 40;
                  const onT = avg >= 70;
                  return (
                    <tr key={emp.user_id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                            {emp.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{emp.full_name || 'Unnamed'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-sm font-black text-slate-900">{emp.total_goals}</td>
                      <td className="p-4 text-center text-sm font-black text-emerald-600">{emp.completed_goals}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full">
                            <div className={`h-1.5 rounded-full ${risk ? 'bg-rose-500' : onT ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${avg}%` }} />
                          </div>
                          <span className={`text-xs font-black ${risk ? 'text-rose-600' : onT ? 'text-emerald-600' : 'text-amber-600'}`}>{avg}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${risk ? 'bg-rose-50 text-rose-700' : onT ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {risk ? 'At Risk' : onT ? 'On Track' : 'Lagging'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Manager Performance Benchmarks */}
      {mgrStats.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-900">Manager Performance Benchmarks</h3>
            <p className="text-xs text-slate-400">Comparative team leadership metrics across all managers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Manager</th>
                  <th className="p-4 text-center">Direct Reports</th>
                  <th className="p-4 text-center">Team Goals</th>
                  <th className="p-4 text-center">Team Avg</th>
                  <th className="p-4 text-center">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mgrStats.map((mgr: any) => (
                  <tr key={mgr.user_id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-blue-700 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                          {mgr.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{mgr.full_name || 'Manager'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{mgr.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-black text-slate-900">{mgr.subordinate_count}</td>
                    <td className="p-4 text-center text-sm font-black text-indigo-600">{mgr.total_goals}</td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-black text-emerald-600">{Math.round(mgr.average_team_progress ?? 0)}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${mgr.pending_approvals > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {mgr.pending_approvals}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
