'use client';

import React, { useMemo } from 'react';

import Link from 'next/link';
import { useGoals, useUpdateGoal, useSubmitGoals, Goal, GoalStatus, GoalPriority } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import { 
  Plus, Search, Filter, SlidersHorizontal, Loader2, Target, 
  Clock, AlertTriangle, CheckCircle2, ChevronRight, FileEdit, Lock, Pencil,
  Users, Send
} from 'lucide-react';
import { useQuarters } from '@/hooks/api/useQuarters';
import { usePushGoal } from '@/hooks/api/useGoals';

export default function GoalsPage() {
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  const resetFilters = useAppStore(state => state.resetFilters);

  const { data: quarters } = useQuarters();

  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  const { data: goalsData, isLoading, error } = useGoals({ quarter: filters.quarter });
  const updateGoal = useUpdateGoal();
  const pushGoal = usePushGoal();
  const submitGoals = useSubmitGoals();
  const user = useAppStore(state => state.user);
  const addNotification = useAppStore(state => state.addNotification);

  // Handle standardizing array vs object responses from different backend versions
  const goalsArray: Goal[] = useMemo(() => {
    if (!goalsData) return [];
    return Array.isArray(goalsData) ? goalsData : goalsData.items || [];
  }, [goalsData]);

  // Client-side filtering and sorting
  const filteredGoals = useMemo(() => {
    let result = [...goalsArray];

    // 1. Search Query Filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(g => 
        g.title.toLowerCase().includes(q) || 
        g.description?.toLowerCase().includes(q) ||
        g.thrust_area.toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter(g => g.status === filters.status);
    }

    // 3. Sorting (Sort by Priority, then Progress)
    result.sort((a, b) => {
      const priorityWeight = {
        [GoalPriority.CRITICAL]: 4,
        [GoalPriority.HIGH]: 3,
        [GoalPriority.MEDIUM]: 2,
        [GoalPriority.LOW]: 1,
      };
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return b.progress - a.progress;
    });

    return result;
  }, [goalsArray, filters.searchQuery, filters.status]);

  const handleProgressUpdate = (id: string, newProgress: number) => {
    updateGoal.mutate({ id, data: { progress: newProgress } });
  };

  const handlePushGoal = async (id: string) => {
    try {
      await pushGoal.mutateAsync({ id, weightage: 10 });
      addNotification({ 
        type: 'success', 
        title: 'Goal Pushed', 
        message: 'This goal has been shared with all your direct subordinates.' 
      });
    } catch (err: any) {
      addNotification({ 
        type: 'error', 
        title: 'Push Failed', 
        message: err?.message || 'Could not push goal to team.' 
      });
    }
  };

  const handleSubmitQuarter = async () => {
    try {
      await submitGoals.mutateAsync(filters.quarter);
      addNotification({
        type: 'success',
        title: 'Quarter Submitted',
        message: 'All goals for ' + filters.quarter + ' have been submitted for approval.'
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: err?.message || 'Failed to submit goals for approval. Make sure total weightage is 100%.'
      });
    }
  };

  const getStatusIcon = (status: GoalStatus) => {
    switch (status) {
      case GoalStatus.DRAFT: return <FileEdit className="w-4 h-4 text-slate-400" />;
      case GoalStatus.SUBMITTED: return <Clock className="w-4 h-4 text-blue-500" />;
      case GoalStatus.APPROVED: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case GoalStatus.REJECTED: return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case GoalStatus.LOCKED: return <Lock className="w-4 h-4 text-purple-500" />;
      default: return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: GoalPriority) => {
    switch (priority) {
      case GoalPriority.CRITICAL: return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Critical</span>;
      case GoalPriority.HIGH: return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold uppercase">High</span>;
      case GoalPriority.MEDIUM: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Medium</span>;
      case GoalPriority.LOW: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Low</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">My Goals</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage and track your objectives for {filters.quarter}.</p>
        </div>
        <div className="flex items-center gap-3">
          {goalsArray.length >= 8 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Limit Reached (8/8)</span>
            </div>
          )}
          <button
            onClick={handleSubmitQuarter}
            disabled={submitGoals.isPending || !goalsArray.some(g => g.status === GoalStatus.DRAFT)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitGoals.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Submit Quarter
          </button>
          <Link 
            href={goalsArray.length >= 8 ? "#" : "/employee/goals/new"}
            onClick={(e) => {
              if (goalsArray.length >= 8) {
                e.preventDefault();
                addNotification({ 
                  type: 'warning', 
                  title: 'Goal Limit Reached', 
                  message: 'You can have a maximum of 8 goals per quarter. Delete or edit existing goals to make room.' 
                });
              }
            }}
            className={`${
              goalsArray.length >= 8 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-sm"
            } px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2`}
          >
            <Plus className="w-5 h-5" />
            Create Goal
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text"
            placeholder="Search goals..."
            value={filters.searchQuery}
            onChange={(e) => setFilter('searchQuery', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest">
            <Filter className="w-4 h-4 text-on-surface-variant" />
            <select 
              className="bg-transparent text-sm font-medium outline-none text-on-surface"
              value={filters.status || 'all'}
              onChange={(e) => setFilter('status', e.target.value === 'all' ? null : e.target.value)}
            >
              <option value="all">All Statuses</option>
              {Object.values(GoalStatus).map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest">
            <select 
              className="bg-transparent text-sm font-medium outline-none text-on-surface"
              value={filters.quarter}
              onChange={(e) => setFilter('quarter', e.target.value)}
            >
              {quarters?.map(q => (
                <option key={q.id} value={q.label}>{q.label} ({q.state})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-medium">Loading goals...</p>
          </div>
        ) : error ? (
          <div className="bg-error-container text-on-error-container p-6 rounded-2xl flex items-center justify-center flex-col gap-2">
            <AlertTriangle className="w-8 h-8" />
            <p className="font-bold">Failed to load goals.</p>
            <button onClick={() => window.location.reload()} className="text-sm underline mt-2">Try again</button>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="bg-surface rounded-2xl p-12 border border-outline-variant text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-on-surface-variant opacity-50" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">No goals found</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                {goalsArray.length === 0 ? "You haven't created any goals for this quarter yet." : "Try adjusting your search or filters."}
              </p>
            </div>
            {goalsArray.length > 0 && (
              <button 
                onClick={resetFilters}
                className="text-primary text-sm font-bold mt-2 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="bg-surface rounded-2xl p-6 border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-2">
                    {getPriorityBadge(goal.priority)}
                    <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                      {getStatusIcon(goal.status)}
                      {goal.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user?.role === 'manager' && !goal.parent_id && (
                      <button
                        onClick={() => handlePushGoal(goal.id)}
                        disabled={pushGoal.isPending}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                        title="Push to Team"
                      >
                        {pushGoal.isPending && pushGoal.variables?.id === goal.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {goal.status === GoalStatus.DRAFT && (
                      <Link
                        href={`/employee/goals/${goal.id}/edit`}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit draft"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-on-surface mb-2 leading-tight group-hover:text-primary transition-colors">
                  {goal.title}
                </h3>
                
                <p className="text-sm text-on-surface-variant line-clamp-2 mb-6 flex-1">
                  {goal.description || "No description provided."}
                </p>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <span>Progress</span>
                    <span className="text-primary">{goal.progress}%</span>
                  </div>
                  
                  <div className="relative w-full h-2 bg-surface-container rounded-full overflow-hidden group/slider cursor-ew-resize">
                    <div 
                      className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={goal.progress}
                      onChange={(e) => handleProgressUpdate(goal.id, parseInt(e.target.value))}
                      disabled={updateGoal.isPending && updateGoal.variables?.id === goal.id}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-surface-container">
                    <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                      <Target className="w-3 h-3" /> {goal.thrust_area}
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">
                      W: {goal.weightage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
