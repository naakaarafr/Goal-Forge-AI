'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useQuarters } from '@/hooks/api/useQuarters';
import {
  useCompletionSummary,
  useHeatmapConfig,
  getTileClass,
  type EmployeeStats,
} from '@/hooks/api/useAnalytics';
import {
  Grid,
  Clock,
  Award,
  AlertTriangle,
  RefreshCw,
  Users,
  Target,
  UserCheck,
  TrendingUp,
  Sliders,
  Mail,
  Building,
} from 'lucide-react';

export default function CompletionHeatmapDashboard() {
  const user = useAppStore(s => s.user);
  const { data: quarters } = useQuarters();
  const { data: config, isLoading: configLoading } = useHeatmapConfig();

  // Local filter states – defaults driven by backend config
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  // daysOverdue         → updates instantly (drives the slider label)
  // debouncedDaysOverdue → updates 500ms after user stops dragging (triggers API refetch)
  const [daysOverdue, setDaysOverdue] = useState<number>(7);
  const [debouncedDaysOverdue, setDebouncedDaysOverdue] = useState<number>(7);
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const [hoveredEmployee, setHoveredEmployee] = useState<EmployeeStats | null>(null);

  const hasInitialized = React.useRef(false);

  // Sync slider default with backend config once loaded
  useEffect(() => {
    if (config && !hasInitialized.current) {
      setDaysOverdue(config.default_days_overdue);
      setDebouncedDaysOverdue(config.default_days_overdue);
      hasInitialized.current = true;
    }
  }, [config]);

  // Debounce: wait 500ms after the user stops moving the slider before refetching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDaysOverdue(daysOverdue), 500);
    return () => clearTimeout(timer);
  }, [daysOverdue]);

  const activeQuarter = quarters?.find(q => q.state === 'active') || quarters?.[0];
  const currentQuarter = selectedQuarter || activeQuarter?.label || '';

  // Keyed on debouncedDaysOverdue so summary only refetches once slider settles
  const { data: summary, isLoading, isRefetching, refetch } = useCompletionSummary(
    { quarter: currentQuarter, days_overdue: debouncedDaysOverdue, force_refresh: forceRefresh },
    !!currentQuarter,
  );

  const activeEmployee = hoveredEmployee || summary?.employee_stats?.[0] || null;

  const handleRefresh = async () => {
    setForceRefresh(true);
    await refetch();
    setForceRefresh(false);
  };

  // Restrict to admins and managers
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-2">
            The Completion Heatmap and Organization Analytics Dashboard is only visible to Managers
            and Administrators.
          </p>
        </div>
      </div>
    );
  }

  // Show spinner while config is being fetched
  if (configLoading || !config) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
        <p className="font-semibold text-sm">Loading dashboard configuration…</p>
      </div>
    );
  }

  // Department aggregation for right-column chart
  const departmentsMap: Record<string, { totalProgress: number; count: number }> = {};
  summary?.employee_stats.forEach(emp => {
    const dept = emp.department_name || 'Unassigned';
    if (!departmentsMap[dept]) departmentsMap[dept] = { totalProgress: 0, count: 0 };
    departmentsMap[dept].totalProgress += emp.average_progress;
    departmentsMap[dept].count += 1;
  });

  const departmentCharts = Object.entries(departmentsMap)
    .map(([name, data]) => ({ name, avg: Math.round(data.totalProgress / data.count) }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Grid className="w-8 h-8 text-teal-600" />
            {config.page_title}
          </h2>
          <p className="text-slate-500 font-medium mt-1">{config.page_subtitle}</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${(isLoading || isRefetching) ? 'animate-spin' : ''}`} />
          {isLoading || isRefetching ? 'Synchronizing…' : 'Sync Live Data'}
        </button>
      </section>

      {/* ── Filters ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Target Quarter
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20"
            value={currentQuarter}
            onChange={e => setSelectedQuarter(e.target.value)}
          >
            {quarters?.map(q => (
              <option key={q.id} value={q.label}>
                {q.label} ({q.state})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Overdue Check-in Threshold
            </label>
            <div className="flex items-center gap-2">
              {/* Show syncing dot while debounce is pending or data is loading */}
              {(daysOverdue !== debouncedDaysOverdue || isRefetching) && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5" /> Updating…
                </span>
              )}
              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                {daysOverdue} Days Inactive
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sliders className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={config.days_overdue_min}
              max={config.days_overdue_max}
              value={daysOverdue}
              onChange={e => setDaysOverdue(parseInt(e.target.value))}
              className="w-full accent-rose-500 bg-slate-100 rounded-lg appearance-none h-2 cursor-pointer"
            />
          </div>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Last Sync:{' '}
            <span className="font-bold text-slate-600">
              {summary ? new Date(summary.last_updated).toLocaleTimeString() : 'Refreshing…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: <Award className="w-6 h-6" />,
            bg: 'bg-teal-50 text-teal-600',
            label: 'Average Completion',
            value: summary ? `${summary.overall_completion_rate}%` : '—',
          },
          {
            icon: <TrendingUp className="w-6 h-6" />,
            bg: 'bg-blue-50 text-blue-600',
            label: 'Weighted Achievement',
            value: summary ? `${summary.weighted_strategic_achievement}%` : '—',
          },
          {
            icon: <Target className="w-6 h-6" />,
            bg: 'bg-indigo-50 text-indigo-600',
            label: 'Total Active Goals',
            value: summary?.total_goals ?? '—',
          },
          {
            icon: <Clock className="w-6 h-6" />,
            bg: 'bg-rose-50 text-rose-600',
            label: 'Overdue Updates',
            value: summary?.overdue_checkins.length ?? '—',
          },
        ].map(card => (
          <div
            key={card.label}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {card.label}
              </span>
              <span className="text-3xl font-black text-slate-800">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Heatmap Matrix */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{config.matrix_title}</h3>
                <p className="text-xs text-slate-500 mt-1">{config.matrix_subtitle}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <p className="font-semibold text-sm">Aggregating heatmaps…</p>
              </div>
            ) : !summary || summary.employee_stats.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Grid className="w-12 h-12 mx-auto mb-2 opacity-25" />
                <p className="font-medium">No employee logs available for this quarter.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Tiles */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {summary.employee_stats.map(emp => (
                    <div
                      key={emp.user_id}
                      onMouseEnter={() => setHoveredEmployee(emp)}
                      onMouseLeave={() => setHoveredEmployee(null)}
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md ring-offset-2 hover:ring-2 ${getTileClass(emp.average_progress, config.color_bands)}`}
                    >
                      <span className="text-xs font-bold truncate max-w-full px-1">
                        {emp.full_name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-black opacity-80">
                        {Math.round(emp.average_progress)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dynamic Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-slate-100 text-xs font-bold text-slate-500">
                  {config.color_bands.map(band => (
                    <div key={band.label} className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded border ${band.bg_class}`} />
                      {band.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Employee Detail Panel */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden min-h-[160px]">
            <div className="absolute -right-4 -top-4 w-36 h-36 bg-teal-500/20 rounded-full blur-3xl" />

            {activeEmployee ? (
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-black">{activeEmployee.full_name}</h4>
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {activeEmployee.email}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      activeEmployee.average_progress === 100
                        ? 'bg-teal-500 text-white animate-pulse'
                        : 'bg-slate-800 text-teal-300'
                    }`}
                  >
                    {activeEmployee.average_progress}% Average Progress
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-800 text-sm">
                  {[
                    {
                      label: 'Department',
                      value: (
                        <span className="font-bold text-slate-200 mt-1 block truncate">
                          <Building className="w-3.5 h-3.5 inline mr-1 text-teal-400" />
                          {activeEmployee.department_name || 'Unassigned'}
                        </span>
                      ),
                    },
                    {
                      label: 'Goals Count',
                      value: (
                        <span className="font-black text-slate-200 mt-1 block">
                          {activeEmployee.total_goals} Goals Active
                        </span>
                      ),
                    },
                    {
                      label: 'Completed',
                      value: (
                        <span className="font-bold text-emerald-400 mt-1 block">
                          {activeEmployee.completed_goals} Goals
                        </span>
                      ),
                    },
                    {
                      label: 'Last Active',
                      value: (
                        <span className="font-bold text-slate-300 mt-1 block">
                          {activeEmployee.last_active
                            ? new Date(activeEmployee.last_active).toLocaleDateString()
                            : 'No Check-ins'}
                        </span>
                      ),
                    },
                  ].map(item => (
                    <div key={item.label}>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">
                        {item.label}
                      </span>
                      {item.value}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center text-center h-full min-h-[110px] text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-55 text-teal-400" />
                <p className="font-semibold text-sm">
                  Hover over an employee block above to inspect granular metrics
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">

          {/* Department Progress */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {config.department_section_title}
            </h3>
            <p className="text-xs text-slate-400 mb-6">{config.department_section_subtitle}</p>

            <div className="space-y-5">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-3 w-1/3 bg-slate-100 rounded" />
                      <div className="h-5 bg-slate-50 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : departmentCharts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center font-medium">
                  No department allocations present.
                </p>
              ) : (
                departmentCharts.map(dept => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-extrabold text-slate-700">{dept.name}</span>
                      <span className="font-black text-slate-900">{dept.avg}% Avg</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${dept.avg}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue Check-ins */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-rose-500" />
              <h3 className="text-lg font-bold text-slate-800">{config.overdue_section_title}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">{config.overdue_section_subtitle}</p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {isLoading ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : !summary || summary.overdue_checkins.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-25 text-emerald-500" />
                  All check-ins are currently on track!
                </div>
              ) : (
                summary.overdue_checkins.map(item => (
                  <div
                    key={item.goal_id}
                    className="p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-1 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-extrabold text-slate-800 truncate">
                        {item.goal_title}
                      </h4>
                      <span className="text-[10px] font-black text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded-full shrink-0">
                        {item.days_since_last_checkin}d late
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>
                        Owner: <strong className="text-slate-700">{item.owner_name}</strong>
                      </span>
                      <span>
                        Last: <strong className="text-slate-700">{item.last_checkin_value ?? '0'}</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Manager Comparison ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{config.manager_section_title}</h3>
        <p className="text-xs text-slate-500 mb-6">{config.manager_section_subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-50 h-32 rounded-3xl" />
            ))
          ) : !summary || summary.manager_stats.length === 0 ? (
            <p className="text-xs text-slate-400 col-span-3 text-center">
              No manager comparisons logged.
            </p>
          ) : (
            summary.manager_stats.map(m => (
              <div
                key={m.user_id}
                className="p-5 border border-slate-200 rounded-3xl hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 truncate">{m.full_name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-slate-800">
                      {Math.round(m.average_team_progress)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-tight">
                      Team Avg
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 text-center text-xs">
                  {[
                    { label: 'Subordinates', value: `${m.subordinate_count} Directs`, color: 'text-slate-700' },
                    { label: 'Team Goals', value: `${m.total_goals} Goals`, color: 'text-slate-700' },
                    {
                      label: 'Pending Review',
                      value: `${m.pending_approvals} Active`,
                      color: m.pending_approvals > 0 ? 'text-rose-600' : 'text-slate-500',
                    },
                  ].map(stat => (
                    <div key={stat.label}>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                        {stat.label}
                      </span>
                      <span className={`font-black block mt-0.5 ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
