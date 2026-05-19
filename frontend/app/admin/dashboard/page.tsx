'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useAppStore } from '@/store';
import { useQuartersAdmin, useUsersAdmin, useEscalations } from '@/hooks/api/useAdmin';
import { useDashboardSummary, useCompletionSummary, useQoQTrends } from '@/hooks/api/useAnalytics';
import { QuarterlyComparisonChart } from '@/components/analytics/QuarterlyComparisonChart';
import { RadialProgress } from '@/components/ui/progress/RadialProgress';
import {
  Shield, Users, AlertOctagon, Unlock, Building2, Calendar,
  Terminal, BarChart3, ChevronRight, ArrowRight, TrendingUp,
  CheckCircle2, Clock, Activity, Zap, Lock, AlertTriangle
} from 'lucide-react';

const mockQoQ = [
  { quarter: '2025-Q2', planned: 85, actual: 79 },
  { quarter: '2025-Q3', planned: 90, actual: 93 },
  { quarter: '2025-Q4', planned: 95, actual: 88 },
  { quarter: '2026-Q1', planned: 100, actual: 95 },
];

export default function AdminGovernanceDashboard() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(s => s.filters);

  const { data: quarters } = useQuartersAdmin();
  const { data: allUsers } = useUsersAdmin();
  const { data: escalations } = useEscalations();
  const { data: summary } = useDashboardSummary();
  const { data: completionData } = useCompletionSummary(
    { quarter: filters.quarter || '2024-Q3' }, !!filters.quarter
  );
  const { data: qoqData, isLoading: qoqLoading } = useQoQTrends(true);

  const activeQuarter = quarters?.find(q => q.state === 'active');
  const openEscalations = (escalations ?? []).filter((e: any) => e.status === 'open' || e.status === 'pending');

  const chartData = React.useMemo(() => {
    if (!qoqData || qoqData.length === 0) return mockQoQ;
    return qoqData.map((item: any) => ({
      quarter: item.quarter,
      planned: 100,
      actual: Math.round(item.avg_progress),
    }));
  }, [qoqData]);

  const statusDist = completionData?.status_distribution ?? {};
  const totalGoals = completionData?.total_goals ?? summary?.total_goals ?? 0;
  const avgProgress = completionData?.overall_avg_progress ?? summary?.avg_progress ?? 0;
  const totalUsers = allUsers?.length ?? summary?.total_users ?? 0;

  const govControls = [
    { label: 'Org Management',     sub: `${totalUsers} users`,              href: '/admin/org',         icon: Building2,    color: 'bg-blue-50 text-blue-700' },
    { label: 'Cycle Management',   sub: `${quarters?.length ?? 0} quarters`, href: '/admin/cycles',      icon: Calendar,     color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Escalation Center',  sub: `${openEscalations.length} open`,   href: '/admin/escalations', icon: AlertOctagon, color: 'bg-rose-50 text-rose-700' },
    { label: 'Unlock Workflows',   sub: 'Force-unlock locked goals',        href: '/admin/unlock',      icon: Unlock,       color: 'bg-amber-50 text-amber-700' },
    { label: 'Enterprise Analytics', sub: 'Org-wide KPI insights',         href: '/admin/analytics',   icon: BarChart3,    color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Audit Center',       sub: 'Security & change logs',           href: '/admin/audit',       icon: Terminal,     color: 'bg-slate-50 text-slate-700' },
  ];

  return (
    <div className="space-y-8 pb-10">

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 shadow-2xl">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -bottom-16 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="bg-white/10 border border-white/20 text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-indigo-400" /> Admin · Governance Hub
              </span>
              {activeQuarter && (
                <>
                  <span className="text-slate-600 text-xs">•</span>
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Active: {activeQuarter.label}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              Enterprise Governance Hub
            </h1>
            <p className="text-slate-300 text-sm font-medium max-w-xl">
              Complete organizational oversight — manage users, quarters, escalations, goal workflows, and audit trails across the entire GoalForge AI platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {openEscalations.length > 0 && (
              <Link href="/admin/escalations" className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all">
                <AlertOctagon className="w-4 h-4" /> {openEscalations.length} Open Escalations
              </Link>
            )}
            <Link href="/admin/audit" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
              <Terminal className="w-4 h-4" /> Audit Logs
            </Link>
          </div>
        </div>
      </section>

      {/* Primary Org KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Across all roles' },
          { label: 'Org Avg Progress', value: `${Math.round(avgProgress)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'All initiatives' },
          { label: 'Total Goals', value: totalGoals, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: filters.quarter },
          { label: 'Open Escalations', value: openEscalations.length, icon: AlertOctagon, color: openEscalations.length > 0 ? 'text-rose-600' : 'text-slate-500', bg: openEscalations.length > 0 ? 'bg-rose-50' : 'bg-slate-50', sub: 'Require review' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
              <div className={`${kpi.bg} p-2 rounded-xl ${kpi.color} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Governance Control Center Grid */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-1 bg-indigo-600 rounded-full" />
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Governance Controls</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {govControls.map(ctrl => (
            <Link
              key={ctrl.href}
              href={ctrl.href}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-slate-200 transition-all group flex items-center gap-4"
            >
              <div className={`${ctrl.color} p-3 rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0`}>
                <ctrl.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{ctrl.label}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{ctrl.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* QoQ Enterprise Chart + Quarter Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Enterprise Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Org-Wide Quarterly Performance</h3>
              <p className="text-xs text-slate-400">Planned vs. actual achievement across the full enterprise</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Live Sync
            </span>
          </div>
          {qoqLoading ? (
            <div className="h-72 bg-slate-50 animate-pulse rounded-2xl" />
          ) : (
            <QuarterlyComparisonChart data={chartData} />
          )}
        </div>

        {/* Quarter Status Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-black text-slate-800 flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-indigo-600" /> Quarter Registry
            </h3>
            <div className="space-y-3">
              {(quarters ?? []).map(q => {
                const cfg = {
                  active:   { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                  planning: { color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
                  review:   { color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
                  closed:   { color: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400' },
                }[q.state] ?? { color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };

                return (
                  <div key={q.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs ${cfg.color}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className="font-black">{q.label}</span>
                      {q.is_immutable && <Lock className="w-3 h-3 opacity-60" />}
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[9px] opacity-80">{q.state}</span>
                  </div>
                );
              })}
              {(!quarters || quarters.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No quarters configured</p>
              )}
            </div>
          </div>
          <Link
            href="/admin/cycles"
            className="mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            Manage Cycles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Goal Status Distribution */}
      {Object.keys(statusDist).length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Organisation Goal Status Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(statusDist).map(([status, count]) => {
              const pct = totalGoals > 0 ? Math.round(((count as number) / totalGoals) * 100) : 0;
              const cfg: Record<string, { label: string; color: string; bg: string }> = {
                draft:     { label: 'Draft',     color: 'text-slate-600',   bg: 'bg-slate-50'   },
                submitted: { label: 'Submitted', color: 'text-blue-600',    bg: 'bg-blue-50'    },
                approved:  { label: 'Approved',  color: 'text-emerald-700', bg: 'bg-emerald-50' },
                rejected:  { label: 'Returned',  color: 'text-rose-700',    bg: 'bg-rose-50'    },
                locked:    { label: 'Locked',    color: 'text-indigo-700',  bg: 'bg-indigo-50'  },
              };
              const style = cfg[status] ?? { label: status, color: 'text-slate-600', bg: 'bg-slate-50' };
              return (
                <div key={status} className={`${style.bg} rounded-2xl p-4`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{style.label}</p>
                  <p className={`text-3xl font-black ${style.color}`}>{count as number}</p>
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
