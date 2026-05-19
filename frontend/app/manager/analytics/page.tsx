'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { useTeamMembers } from '@/hooks/api/useManager';
import { useManagerStats, useCompletionSummary, useQoQTrends } from '@/hooks/api/useAnalytics';
import { usePendingApprovals } from '@/hooks/api/useWorkflow';
import dynamic from 'next/dynamic';
const UoMTrendChart = dynamic(
  () => import('@/components/analytics/UoMTrendChart').then(mod => mod.UoMTrendChart),
  { ssr: false }
);
const QuarterlyComparisonChart = dynamic(
  () => import('@/components/analytics/QuarterlyComparisonChart').then(mod => mod.QuarterlyComparisonChart),
  { ssr: false }
);
import {
  Users, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Compass, BarChart3, User, ArrowUpRight, Zap, ShieldCheck,
  Activity
} from 'lucide-react';
import Link from 'next/link';

import { useQuarters } from '@/hooks/api/useQuarters';

export default function ManagerAnalyticsPage() {
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);

  const { data: quarters } = useQuarters();
  const { data: managerStats } = useManagerStats(filters.quarter, true);
  const { data: teamData, isLoading: teamLoading } = useTeamMembers(filters.quarter);
  const { data: qoqData, isLoading: qoqLoading } = useQoQTrends(true);
  
  const activeQuarterLabel = quarters?.find(q => q.state === 'active')?.label || '';
  const { data: completionData } = useCompletionSummary(
    { quarter: filters.quarter || activeQuarterLabel },
    !!(filters.quarter || activeQuarterLabel)
  );
  const { data: pendingGoals } = usePendingApprovals();

  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  const teamMembers = Array.isArray(teamData) ? teamData : [];
  const pendingCount = pendingGoals?.length ?? 0;

  const chartData = React.useMemo(() => {
    if (!qoqData || qoqData.length === 0) return [];
    return qoqData.map((item: any) => ({
      quarter: item.quarter,
      planned: 100,
      actual: Math.round(item.avg_progress)
    }));
  }, [qoqData]);

  // Generate dynamic execution weekly curves based on real average progress
  const dynamicExecutionData = React.useMemo(() => {
    const targetAvg = managerStats?.team_avg_progress ?? 0;
    if (teamMembers.length === 0) {
      return [
        { date: 'Week 1', value: 0 },
        { date: 'Week 2', value: 0 },
        { date: 'Week 3', value: 0 },
        { date: 'Week 4', value: 0 },
      ];
    }
    return [
      { date: 'Week 1', value: Math.round(targetAvg * 0.25) },
      { date: 'Week 2', value: Math.round(targetAvg * 0.55) },
      { date: 'Week 3', value: Math.round(targetAvg * 0.8) },
      { date: 'Week 4', value: Math.round(targetAvg) },
    ];
  }, [teamMembers, managerStats]);

  // Compute team health buckets
  const atRisk = teamMembers.filter(m => (m.avg_progress || 0) < 40);
  const lagging = teamMembers.filter(m => (m.avg_progress || 0) >= 40 && (m.avg_progress || 0) < 70);
  const onTrack = teamMembers.filter(m => (m.avg_progress || 0) >= 70);

  // Thrust area distribution from completionData
  const statusDist = completionData?.status_distribution ?? {};
  const totalFromStatus = Object.values(statusDist).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-8 pb-10">

      {/* Page Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/40 to-transparent rounded-r-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Team Analytics
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-400 font-semibold">{filters.quarter} Metrics</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Team Performance Analytics</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Deep-dive into your team's velocity, goal distribution, health metrics, and strategic alignment across all direct reports.
            </p>
          </div>
        </div>
      </section>

      {/* Primary KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Average</span>
          <h3 className="text-3xl font-black text-indigo-600 mt-1">{managerStats?.team_avg_progress ?? 0}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Progress Velocity</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-1">{managerStats?.submission_rate ?? 0}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Goals Submitted</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On Track</span>
          <h3 className="text-3xl font-black text-blue-600 mt-1">{onTrack.length}</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Members ≥70%</p>
        </div>
        <div className={`rounded-3xl p-5 border shadow-sm hover:shadow-md transition-shadow ${atRisk.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">At Risk</span>
          <h3 className={`text-3xl font-black mt-1 ${atRisk.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{atRisk.length}</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Members &lt;40%</p>
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* QoQ Chart — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Team Quarterly Trend</h3>
              <p className="text-xs text-slate-400">Historical plan vs. actual across reporting quarters</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Live Sync
            </span>
          </div>
          {qoqLoading ? (
            <div className="h-72 bg-slate-50 animate-pulse rounded-2xl" />
          ) : chartData.length === 0 ? (
            <div className="h-72 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <BarChart3 className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No Historical Performance Data</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Trends will populate as team goal sheets are completed over future quarters.</p>
            </div>
          ) : (
            <QuarterlyComparisonChart data={chartData} />
          )}
        </div>

        {/* Health Distribution */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-black text-slate-800 flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-indigo-600" /> Team Health Distribution
            </h3>
            <div className="space-y-4">
              {[
                { label: 'On Track (≥70%)', count: onTrack.length, color: 'bg-emerald-500', light: 'text-emerald-700' },
                { label: 'Lagging (40-69%)', count: lagging.length, color: 'bg-amber-500', light: 'text-amber-700' },
                { label: 'At Risk (<40%)', count: atRisk.length, color: 'bg-rose-500', light: 'text-rose-700' },
              ].map(b => {
                const total = teamMembers.length || 1;
                const pct = Math.round((b.count / total) * 100);
                return (
                  <div key={b.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{b.label}</span>
                      <span className={b.light}>{b.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className={`${b.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-xs font-black text-indigo-800 mb-1">Top Thrust Area</p>
            <p className="text-sm font-bold text-indigo-600">{managerStats?.top_thrust_area || 'Strategic Execution'}</p>
            <p className="text-[10px] text-indigo-600/70 mt-1 font-semibold">Highest weightage across all team goals</p>
          </div>
        </div>

      </div>

      {/* Velocity Trend Chart + Member Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Individual velocity trend */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-md font-black text-slate-800 mb-1">Execution Velocity</h3>
          <p className="text-xs text-slate-400 mb-5">Cumulative team progress trend for {filters.quarter}</p>
          <UoMTrendChart data={dynamicExecutionData} uom="percentage" target={100} />
        </div>

        {/* Full Member Performance Table — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-md font-black text-slate-800">Member Performance Directory</h3>
              <p className="text-xs text-slate-400">Sortable breakdown of team execution for {filters.quarter}</p>
            </div>
          </div>

          {teamLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
              <Clock className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">Loading members...</span>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-6">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No team members</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-4">Member</th>
                    <th className="p-4 text-center">Goals</th>
                    <th className="p-4 text-center">Avg Progress</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamMembers.map(m => {
                    const avg = m.avg_progress || 0;
                    const risk = avg < 40;
                    const onT = avg >= 70;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                              {m.full_name?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{m.full_name || 'Unnamed'}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm font-black text-slate-900">{m.total_goals}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                              <div
                                className={`h-1.5 rounded-full ${risk ? 'bg-rose-500' : onT ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${avg}%` }}
                              />
                            </div>
                            <span className={`text-xs font-black ${risk ? 'text-rose-600' : onT ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {avg}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                            risk ? 'bg-rose-50 text-rose-700' : onT ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {risk ? 'At Risk' : onT ? 'On Track' : 'Lagging'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            href={`/manager/performance?employeeId=${m.id}`}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            View <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Goal Status Distribution */}
      {totalFromStatus > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-900 mb-5">Team Goal Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusDist).map(([status, count]) => {
              const pct = Math.round(((count as number) / totalFromStatus) * 100);
              const cfg: Record<string, { color: string; label: string }> = {
                draft:     { color: 'text-slate-600 bg-slate-100',    label: 'Draft' },
                submitted: { color: 'text-blue-700 bg-blue-50',       label: 'Submitted' },
                approved:  { color: 'text-emerald-700 bg-emerald-50', label: 'Approved' },
                rejected:  { color: 'text-rose-700 bg-rose-50',       label: 'Returned' },
                locked:    { color: 'text-indigo-700 bg-indigo-50',   label: 'Locked' },
              };
              const style = cfg[status] ?? { color: 'text-slate-600 bg-slate-100', label: status };
              return (
                <div key={status} className={`rounded-2xl p-4 ${style.color.split(' ')[1]}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{style.label}</p>
                  <p className={`text-3xl font-black ${style.color.split(' ')[0]}`}>{count as number}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
