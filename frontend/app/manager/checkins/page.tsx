'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { useTeamMembers, useEmployeeSummary, useSubmitFeedback } from '@/hooks/api/useManager';
import { useQuarters } from '@/hooks/api/useQuarters';
import {
  Users, MessageSquare, Star, CheckCircle2, Clock, ArrowRight,
  User, ChevronRight, Loader2, AlertTriangle, Send, ShieldCheck,
  TrendingUp, MessageCircle, Lock, X
} from 'lucide-react';
import Link from 'next/link';

const ratingConfig = {
  exceeds_expectations: { label: 'Exceeds Expectations', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  meets_expectations:  { label: 'Meets Expectations',  color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  needs_improvement:   { label: 'Needs Improvement',   color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
};

function EmployeeFeedbackPanel({ memberId, memberName }: { memberId: string; memberName: string }) {
  const filters = useAppStore(state => state.filters);
  const addNotification = useAppStore(state => state.addNotification);

  const { data: summary, isLoading } = useEmployeeSummary(memberId, filters.quarter);
  const submitFeedback = useSubmitFeedback();
  const { data: quarters } = useQuarters();

  const existingFeedback = summary?.feedback;
  const [rating, setRating] = React.useState<'exceeds_expectations' | 'meets_expectations' | 'needs_improvement'>(
    existingFeedback?.performance_rating || 'meets_expectations'
  );
  const [strengths, setStrengths] = React.useState(existingFeedback?.strengths || '');
  const [devAreas, setDevAreas] = React.useState(existingFeedback?.development_areas || '');
  const [summary2, setSummary2] = React.useState(existingFeedback?.discussion_summary || '');
  const [isFinalize, setIsFinalize] = React.useState(false);

  // Sync fields when existing feedback loads
  React.useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.performance_rating);
      setStrengths(existingFeedback.strengths);
      setDevAreas(existingFeedback.development_areas);
      setSummary2(existingFeedback.discussion_summary || '');
    }
  }, [existingFeedback]);

  const activeQ = quarters?.find(q => q.state === 'active') || quarters?.[0];
  const activeQuarterLabel = activeQ?.label || '';

  const handleSubmit = async () => {
    if (!strengths.trim() || !devAreas.trim()) {
      addNotification({ type: 'warning', title: 'Incomplete', message: 'Please fill in Strengths and Development Areas.' });
      return;
    }
    try {
      await submitFeedback.mutateAsync({
        employeeId: memberId,
        payload: {
          employee_id: memberId,
          quarter: filters.quarter || activeQuarterLabel || 'Q4',
          performance_rating: rating,
          strengths,
          development_areas: devAreas,
          discussion_summary: summary2 || undefined,
          is_finalized: isFinalize,
        }
      });
      addNotification({
        type: 'success',
        title: isFinalize ? 'Feedback Finalized' : 'Feedback Saved',
        message: `${isFinalize ? 'Finalized' : 'Saved'} review for ${memberName}.`
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Save Failed', message: err.message || 'Could not save feedback.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-semibold">Loading employee data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Goals Progress Summary */}
      {summary && summary.goals.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Goal Progress ({filters.quarter})</h4>
          <div className="space-y-2">
            {summary.goals.slice(0, 4).map(g => (
              <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{g.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                      <div className="h-1.5 bg-indigo-600 rounded-full" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 flex-shrink-0">{g.progress}%</span>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{g.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="text-xs font-bold text-indigo-800">
              Weighted Achievement: <span className="text-indigo-600">{Math.round(summary.weighted_achievement_score)}%</span>
              &nbsp;·&nbsp; {summary.total_goals} Goals
            </span>
          </div>
        </div>
      )}

      {/* Finalized indicator */}
      {existingFeedback?.is_finalized && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-xs font-bold">
          <Lock className="w-4 h-4" /> Feedback finalized and locked for this quarter
        </div>
      )}

      {/* Performance Rating */}
      <div>
        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Performance Rating</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.entries(ratingConfig) as [keyof typeof ratingConfig, typeof ratingConfig[keyof typeof ratingConfig]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setRating(key)}
              disabled={existingFeedback?.is_finalized}
              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-2 ${
                rating === key
                  ? cfg.color + ' border-current shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              } disabled:opacity-60`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rating === key ? cfg.dot : 'bg-slate-300'}`} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div>
        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
          Observed Strengths <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={strengths}
          onChange={e => setStrengths(e.target.value)}
          disabled={existingFeedback?.is_finalized}
          rows={3}
          placeholder="What is this employee doing exceptionally well? Be specific and cite examples from the quarter..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none transition-all disabled:opacity-60 disabled:bg-slate-50 font-semibold"
        />
      </div>

      {/* Development Areas */}
      <div>
        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
          Development Areas <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={devAreas}
          onChange={e => setDevAreas(e.target.value)}
          disabled={existingFeedback?.is_finalized}
          rows={3}
          placeholder="What should this employee focus on improving? What coaching or resources are recommended..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none transition-all disabled:opacity-60 disabled:bg-slate-50 font-semibold"
        />
      </div>

      {/* Discussion Summary */}
      <div>
        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
          Check-in Discussion Summary <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          value={summary2}
          onChange={e => setSummary2(e.target.value)}
          disabled={existingFeedback?.is_finalized}
          rows={2}
          placeholder="Key takeaways from your 1-on-1 or quarterly discussion..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none transition-all disabled:opacity-60 disabled:bg-slate-50 font-semibold"
        />
      </div>

      {/* Action bar */}
      {!existingFeedback?.is_finalized && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => { setIsFinalize(false); handleSubmit(); }}
            disabled={submitFeedback.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
          >
            {submitFeedback.isPending && !isFinalize ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => { setIsFinalize(true); handleSubmit(); }}
            disabled={submitFeedback.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-40"
          >
            {submitFeedback.isPending && isFinalize ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Finalize & Lock
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagerCheckinsPage() {
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  const { data: quarters } = useQuarters();
  const { data: teamData, isLoading } = useTeamMembers(filters.quarter);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

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
  const selectedMember = teamMembers.find(m => m.id === selectedId);

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-blue-50/40 to-transparent rounded-r-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Check-ins & Comments
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-400 font-semibold">{filters.quarter || quarters?.find(q => q.state === 'active')?.label || 'Active'} Reviews</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Quarterly Feedback Center</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Write structured performance feedback, rate direct reports, and finalize quarterly reviews. All feedback is securely stored and linked to goal data.
            </p>
          </div>
        </div>
      </section>

      {/* Two-panel layout: member list + feedback form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Member Selector Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Select Team Member
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">{teamMembers.length} direct reports</p>
          </div>

          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading team...</span>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="py-10 text-center text-slate-400 px-4">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No team members</p>
                <p className="text-[10px] mt-1">Assign employees from Team Manager</p>
              </div>
            ) : (
              teamMembers.map((member) => {
                const avg = member.avg_progress || 0;
                const isSelected = member.id === selectedId;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedId(member.id)}
                    className={`w-full text-left px-4 py-4 flex items-center gap-3 transition-all hover:bg-indigo-50/50 ${
                      isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-600'
                    }`}>
                      {member.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {member.full_name || 'Unnamed'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{avg}% avg progress</p>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Feedback Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-2">Select a Team Member</h3>
              <p className="text-xs text-slate-400 max-w-xs font-semibold leading-normal">
                Choose a direct report from the panel on the left to write their quarterly performance review, add comments, and finalize your evaluation.
              </p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {selectedMember?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedMember?.full_name || 'Team Member'}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{selectedMember?.email} · {filters.quarter} Review</p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <EmployeeFeedbackPanel memberId={selectedId} memberName={selectedMember?.full_name || 'Member'} />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
