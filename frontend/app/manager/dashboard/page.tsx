'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useGoals } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import { useManagerStats, useQoQTrends, useCompletionSummary } from '@/hooks/api/useAnalytics';
import { useTeamMembers } from '@/hooks/api/useManager';
import { usePendingApprovals } from '@/hooks/api/useWorkflow';
import { 
  CheckCircle2, Clock, TrendingUp, Sparkles, AlertTriangle,
  ArrowRight, ClipboardCheck, Users, Target, Zap, ChevronRight,
  User, BarChart3, MessageSquare, ShieldCheck, Activity, Calendar
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import { RadialProgress } from '@/components/ui/progress/RadialProgress';
import { QuarterlyComparisonChart } from '@/components/analytics/QuarterlyComparisonChart';
import { useQuarters } from '@/hooks/api/useQuarters';
import { QuarterTimeline } from '@/components/ui/progress/QuarterTimeline';

function getTeamInsight(stats: any, teamSize: number, pendingCount: number): string {
  if (!stats) return 'Loading strategic overview...';
  
  const avg = stats.team_avg_progress || 0;
  const subRate = stats.submission_rate || 0;
  
  if (pendingCount > 3) {
    return `Action required: ${pendingCount} goal submissions are awaiting your review. Early approval unlocks team momentum and prevents deadline bottlenecks this quarter.`;
  }
  if (avg >= 80) {
    return `Exceptional team execution! Your ${teamSize}-person team is averaging ${avg}% progress with a ${subRate}% submission rate. This places you in the top performance tier for ${stats.top_thrust_area || 'your key thrust area'}.`;
  }
  if (subRate < 60) {
    return `Submission gap detected: Only ${subRate}% of your team has submitted goals for review. Proactively reach out to remaining members to ensure full quarterly alignment.`;
  }
  return `Your team is progressing at ${avg}% average completion. Focus on ${stats.top_thrust_area || 'core'} initiatives — this thrust area has the highest collective weightage across your direct reports.`;
}

export default function ManagerDashboardPage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);

  const { data: quarters, isLoading: quartersLoading } = useQuarters();
  const selectedQuarter = React.useMemo(() => {
    if (!quarters) return null;
    return quarters.find(q => q.label === filters.quarter) || quarters.find(q => q.state === 'active') || quarters[0];
  }, [quarters, filters.quarter]);

  const { data: managerStats, isLoading: statsLoading } = useManagerStats(filters.quarter, true);
  const { data: teamData } = useTeamMembers(filters.quarter);
  const { data: pendingGoals } = usePendingApprovals();
  const { data: qoqData, isLoading: qoqLoading } = useQoQTrends(true);
  
  const activeQuarterLabel = selectedQuarter?.label || '';
  const { data: completionData } = useCompletionSummary(
    { quarter: filters.quarter || activeQuarterLabel },
    !!(filters.quarter || activeQuarterLabel)
  );

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

  // Team health indicators from members
  const atRiskCount = teamMembers.filter(m => (m.avg_progress || 0) < 40).length;
  const onTrackCount = teamMembers.filter(m => (m.avg_progress || 0) >= 70).length;

  return (
    <div className="space-y-8 pb-10">

      {/* Manager Command Center Header */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Manager Portal
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {filters.quarter || selectedQuarter?.label || 'Active Quarter'}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              Command Center
            </h1>
            <p className="text-slate-300 text-sm font-medium max-w-lg">
              Oversee team execution, approve initiatives, manage quarterly reviews, and drive strategic performance for {user?.full_name || 'your team'}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {pendingCount > 0 && (
              <Link
                href="/manager/approvals"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <ClipboardCheck className="w-4 h-4" />
                {pendingCount} Pending {pendingCount === 1 ? 'Approval' : 'Approvals'}
              </Link>
            )}
            <Link
              href="/manager/team"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <Users className="w-4 h-4" /> Manage Team
            </Link>
          </div>
        </div>
      </section>

      {/* Quarterly Timeline */}
      <QuarterTimeline quarter={selectedQuarter} isLoading={quartersLoading} />

      {/* Primary Manager KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Team Avg Progress */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Velocity</span>
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{managerStats?.team_avg_progress ?? 0}%</span>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">Avg Team Progress</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${managerStats?.team_avg_progress ?? 0}%` }} />
          </div>
        </div>

        {/* Submission Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission Rate</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{managerStats?.submission_rate ?? 0}%</span>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">{managerStats?.total_subordinates ?? 0} Direct Reports</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${managerStats?.submission_rate ?? 0}%` }} />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className={`rounded-3xl p-5 border shadow-sm hover:shadow-md transition-shadow group ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Queue</span>
            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${pendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pendingCount}</span>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">Goals Awaiting Review</p>
          <Link href="/manager/approvals" className={`mt-3 flex items-center gap-1 text-xs font-bold ${pendingCount > 0 ? 'text-amber-700 hover:text-amber-800' : 'text-slate-400'}`}>
            Review Now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* At-Risk Members */}
        <div className={`rounded-3xl p-5 border shadow-sm hover:shadow-md transition-shadow group ${atRiskCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Radar</span>
            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${atRiskCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black ${atRiskCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{atRiskCount}</span>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">Members Below 40%</p>
          <Link href="/manager/analytics" className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700">
            View Analysis <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </section>

      {/* Main Content Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Team Member Directory — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">Team Overview</h3>
              <p className="text-xs text-slate-400">Direct report performance for {filters.quarter || selectedQuarter?.label || 'Active Quarter'}</p>
            </div>
            <Link href="/manager/team" className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1">
              Full Roster <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-50">
            {teamMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No team members configured</p>
                <p className="text-xs mt-1">Use Team Manager to assign direct reports.</p>
              </div>
            ) : (
              teamMembers.slice(0, 5).map((member) => {
                const avg = member.avg_progress || 0;
                const risk = avg < 40;
                const onTrack = avg >= 70;
                return (
                  <div key={member.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {member.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {member.full_name || 'Unnamed Member'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{member.email}</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-24 hidden md:block">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>{avg}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div
                          className={`h-1.5 rounded-full transition-all ${risk ? 'bg-rose-500' : onTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex-shrink-0 ${
                      risk ? 'bg-rose-50 text-rose-700' :
                      onTrack ? 'bg-emerald-50 text-emerald-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {risk ? 'At Risk' : onTrack ? 'On Track' : 'Lagging'}
                    </span>

                    <Link
                      href={`/manager/performance?employeeId=${member.id}`}
                      className="text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {teamMembers.length > 5 && (
            <div className="p-4 border-t border-slate-50 text-center">
              <Link href="/manager/team" className="text-xs font-bold text-indigo-600 hover:underline">
                View all {teamMembers.length} team members →
              </Link>
            </div>
          )}
        </div>

        {/* Right column: AI Insight + Quick Links */}
        <div className="flex flex-col gap-6">

          {/* AI Team Strategic Insight */}
          <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-xl text-white">
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-black tracking-tight">Team Strategy Radar</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed relative z-10 font-medium min-h-[72px]">
              {statsLoading ? 'Compiling team intelligence...' : getTeamInsight(managerStats, teamMembers.length, pendingCount)}
            </p>
            <Link
              href="/manager/analytics"
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center w-full gap-2 relative z-10"
            >
              Open Team Analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Action Cards */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-black text-slate-800 mb-4">Quick Actions</h3>
            {[
              { label: 'Review Pending Approvals', sub: `${pendingCount} awaiting`, icon: ClipboardCheck, href: '/manager/approvals', color: 'text-amber-600 bg-amber-50' },
              { label: 'Add Check-in Comment', sub: `${teamMembers.length} active reports`, icon: MessageSquare, href: '/manager/checkins', color: 'text-blue-600 bg-blue-50' },
              { label: 'Team Analytics', sub: 'Deep performance view', icon: BarChart3, href: '/manager/analytics', color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Completion Heatmap', sub: 'Visual grid overview', icon: Activity, href: '/manager/completion', color: 'text-emerald-600 bg-emerald-50' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
              >
                <div className={`p-2 rounded-xl ${action.color} group-hover:scale-105 transition-transform`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">{action.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{action.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* QoQ Team Performance Chart */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Team Quarterly Performance</h3>
            <p className="text-xs text-slate-400">Historical planned targets vs actual achievement across your team</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            {qoqLoading ? 'Loading team trends...' : 'Team Data Live'}
          </div>
        </div>
        {qoqLoading ? (
          <div className="w-full h-80 bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-sm font-bold">
            Compiling team metrics...
          </div>
        ) : (
          <QuarterlyComparisonChart data={chartData} />
        )}
      </section>

    </div>
  );
}
