'use client';

import React, { useState, useDeferredValue } from 'react';
import { useAppStore } from '@/store';
import { useAuditLogs } from '@/hooks/api/useAdmin';
import { 
  ShieldAlert, Terminal, Search, Filter, Calendar, 
  PlusCircle, RefreshCw, Trash2, Lock, User, 
  ArrowRight, ChevronDown, ChevronUp, Globe, X, 
  Activity, AlertCircle, AlertTriangle
} from 'lucide-react';

export default function AuditTimelinePage() {
  const user = useAppStore(state => state.user);
  
  // Dynamic filter state
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityName, setEntityName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Defer search to avoid unnecessary API query throttling
  const deferredSearch = useDeferredValue(search);

  // Fetch larger recent logs snapshot to derive unique action and entity names dynamically
  const { data: allLogs } = useAuditLogs({ size: 200 });

  const uniqueActions = React.useMemo(() => {
    if (!allLogs) return [];
    return Array.from(new Set(allLogs.map(log => log.action))).filter(Boolean);
  }, [allLogs]);

  const uniqueEntities = React.useMemo(() => {
    if (!allLogs) return [];
    return Array.from(new Set(allLogs.map(log => log.entity_name))).filter(Boolean);
  }, [allLogs]);

  // Bind parameters to our upgraded React Query hook
  const { data: logs, isLoading, error } = useAuditLogs({
    search: deferredSearch || undefined,
    action: action || undefined,
    entity_name: entityName || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined
  });

  // Verify administrative privileges
  if (user?.role !== 'admin' && user?.role !== undefined) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-rose-100 max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            You do not have administrative privileges to view the enterprise audit logs. Please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearch('');
    setAction('');
    setEntityName('');
    setStartDate('');
    setEndDate('');
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl translate-y-1/3"></div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold tracking-wider text-xs uppercase mb-2">
            <Terminal className="w-4 h-4" />
            Security & System Integrity
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Audit Trail</h1>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Monitor real-time system changes, track user operations, inspect model deltas, and audit goal changes after lock dates.
          </p>
        </div>

        <div className="relative z-10 flex flex-row items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl w-fit">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-xs text-slate-300 font-medium">
            Active Listeners Logged: <span className="text-white font-mono font-bold">{logs?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Control Center (Filters & Search) */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-extrabold text-sm">
            <Filter className="w-4 h-4 text-blue-500" />
            Interactive Search Controls
          </div>
          {(search || action || entityName || startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search actors, targets, or changes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 font-medium"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Entity Name Filter */}
          <div>
            <select
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 font-medium"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          {/* Date Picker Range button/input container */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
                className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
                className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="relative">
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 bg-white border border-slate-200 rounded-3xl animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                  <div className="h-8 bg-slate-50 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 max-w-lg mx-auto">
            <AlertCircle className="w-10 h-10 mx-auto mb-3" />
            <h4 className="font-extrabold text-lg">Failed to retrieve logs</h4>
            <p className="text-sm text-rose-500/90 mt-1">
              An unexpected network failure occurred. Please confirm your local backend server is running and try again.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && logs?.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-lg">No Audit Logs Found</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                There are no actions logged matching the active search parameters. Try expanding your search queries or clearing filters.
              </p>
            </div>
            <button 
              onClick={clearFilters}
              className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* GitHub-style Timeline Feed */}
        {!isLoading && !error && logs && logs.length > 0 && (
          <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:inset-y-0 before:left-3.5 sm:before:left-5 before:w-[2px] before:bg-slate-200">
            {logs.map((log) => {
              const hasPostLock = log.new_values?.after_lock === true;
              
              // Action styling maps
              const actionColors = {
                CREATE: {
                  bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  icon: PlusCircle,
                  badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  accent: 'border-l-emerald-500'
                },
                UPDATE: {
                  bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                  icon: RefreshCw,
                  badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                  accent: 'border-l-indigo-500'
                },
                DELETE: {
                  bg: 'bg-rose-50 text-rose-600 border-rose-100',
                  icon: Trash2,
                  badge: 'bg-rose-100 text-rose-800 border-rose-200',
                  accent: 'border-l-rose-500'
                },
                FORCE_UNLOCK: {
                  bg: 'bg-amber-50 text-amber-600 border-amber-100',
                  icon: Lock,
                  badge: 'bg-amber-100 text-amber-800 border-amber-200',
                  accent: 'border-l-amber-500'
                }
              }[log.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'FORCE_UNLOCK'] || {
                bg: 'bg-slate-50 text-slate-600 border-slate-100',
                icon: Activity,
                badge: 'bg-slate-100 text-slate-800 border-slate-200',
                accent: 'border-l-slate-400'
              };

              const Icon = actionColors.icon;

              return (
                <div key={log.id} className="relative group animate-in slide-in-from-bottom-3 duration-250">
                  {/* Vertical Timeline Pin */}
                  <span className={`absolute -left-6 sm:-left-10 top-2.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-sm z-10 transition duration-200 ${actionColors.bg}`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  </span>

                  {/* Card Container */}
                  <div className={`bg-white border border-slate-200/85 hover:border-slate-300 rounded-3xl shadow-sm p-4 sm:p-6 transition duration-200 border-l-4 ${actionColors.accent}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Operations details */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${actionColors.badge}`}>
                            {log.action}
                          </span>
                          <span className="text-slate-400 font-bold text-[10px]">•</span>
                          <span className="text-slate-800 text-sm font-bold">
                            Modified {log.entity_name}
                          </span>
                          {hasPostLock && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Post-Lock Mutation
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                          {/* Actor info */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-extrabold text-slate-600 uppercase">
                              {log.actor_email ? log.actor_email.substring(0, 2) : 'SY'}
                            </span>
                            <span className="font-bold text-slate-700">{log.actor_email || 'System Operation'}</span>
                          </div>
                          
                          <span className="hidden sm:inline text-slate-300">|</span>

                          {/* IP Address */}
                          {log.ip_address && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono text-slate-600">{log.ip_address}</span>
                            </div>
                          )}

                          <span className="hidden sm:inline text-slate-300">|</span>

                          {/* Timestamp */}
                          <span className="text-slate-400">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Right: Expand details & quick facts */}
                      <div className="flex items-center justify-between lg:justify-end gap-3 border-t border-slate-100 lg:border-none pt-3 lg:pt-0 shrink-0">
                        <span className="font-mono text-[10px] text-slate-400 select-all">
                          ID: {log.entity_id.substring(0, 8)}...
                        </span>
                        
                        {(Object.keys(log.old_values || {}).length > 0 || Object.keys(log.new_values || {}).length > 0) && (
                          <button 
                            onClick={() => toggleExpand(log.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition duration-150"
                          >
                            {expandedLogId === log.id ? (
                              <>
                                Hide Changes <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            ) : (
                              <>
                                Inspect Changes <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Diffs visualizer */}
                    {expandedLogId === log.id && (
                      <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Diff Field-by-Field Viewer */}
                        <div className="rounded-2xl border border-slate-150 overflow-hidden bg-slate-50/50">
                          <div className="grid grid-cols-3 gap-4 px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            <div>Attribute Key</div>
                            <div>Before Values</div>
                            <div>After Values</div>
                          </div>

                          <div className="divide-y divide-slate-150">
                            {(() => {
                              const keys = Array.from(new Set([
                                ...Object.keys(log.old_values || {}),
                                ...Object.keys(log.new_values || {})
                              ])).filter(k => k !== 'after_lock'); // Skip locked metadata key

                              if (keys.length === 0) {
                                return (
                                  <div className="p-4 text-center text-xs text-slate-400 italic">
                                    No attribute modifications detected.
                                  </div>
                                );
                              }

                              return keys.map((key) => {
                                const oldVal = log.old_values?.[key];
                                const newVal = log.new_values?.[key];

                                // Skip unmodified fields inside list
                                if (oldVal === newVal) return null;

                                return (
                                  <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 p-4 text-xs font-medium">
                                    <div className="font-mono font-bold text-slate-700 break-all md:self-center">
                                      {key}
                                    </div>
                                    <div className="break-all">
                                      {oldVal !== undefined && oldVal !== null ? (
                                        <span className="inline-block px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 font-mono text-[11px] line-through w-full md:w-auto">
                                          {String(oldVal)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic font-normal">None</span>
                                      )}
                                    </div>
                                    <div className="break-all flex items-center gap-2">
                                      <ArrowRight className="hidden md:inline w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      {newVal !== undefined && newVal !== null ? (
                                        <span className="inline-block px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[11px] w-full md:w-auto">
                                          {String(newVal)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic font-normal">None</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Post lock notice panel */}
                        {hasPostLock && (
                          <div className="flex gap-3 bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                                Post-Lock Modification Security Alert
                              </h5>
                              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                This resource was modified after the goal quarter was locked. Changes committed under this state are subject to strict administrative audit trails.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
