'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Users, Search, Filter, ShieldCheck, History, Award, 
  MessageSquare, ChevronRight, X, Sparkles, CheckCircle2,
  AlertCircle, Calendar, ArrowUpRight, BarChart3, Plus, Send,
  TrendingUp, HelpCircle, FileCheck2, User
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useAppStore } from '@/store';
import { 
  useTeamMembers, 
  useEmployeeSummary, 
  useDiscussionHistory, 
  useSubmitFeedback,
  TeamMember,
  FeedbackSubmitPayload
} from '@/hooks/api/useManager';
import { useQuarters } from '@/hooks/api/useQuarters';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';

export default function PerformancePage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId');
  
  const { data: quarters } = useQuarters();
  const { data: teamMembers, isLoading: teamLoading, refetch: refetchTeam } = useTeamMembers(filters.quarter);
  
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'timeline'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Feedback Form State
  const [rating, setRating] = useState<'exceeds_expectations' | 'meets_expectations' | 'needs_improvement'>('meets_expectations');
  const [strengths, setStrengths] = useState('');
  const [developmentAreas, setDevelopmentAreas] = useState('');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  // Queries for Selected Employee Details
  const { data: employeeSummary, isLoading: summaryLoading } = useEmployeeSummary(
    selectedMember?.id || null,
    filters.quarter,
    !!selectedMember
  );

  const { data: discussionHistory, isLoading: historyLoading } = useDiscussionHistory(
    selectedMember?.id || null,
    filters.quarter,
    !!selectedMember
  );

  const submitFeedbackMutation = useSubmitFeedback();

  // Auto-select employee from URL query parameter
  React.useEffect(() => {
    if (employeeIdParam && teamMembers) {
      const member = teamMembers.find(m => m.id === employeeIdParam);
      if (member) {
        setSelectedMember(member);
        setActiveTab('review');
      }
    }
  }, [employeeIdParam, teamMembers]);

  // Populate form if existing feedback exists
  React.useEffect(() => {
    if (employeeSummary?.feedback) {
      setRating(employeeSummary.feedback.performance_rating);
      setStrengths(employeeSummary.feedback.strengths);
      setDevelopmentAreas(employeeSummary.feedback.development_areas);
      setDiscussionSummary(employeeSummary.feedback.discussion_summary || '');
      setIsFinalized(employeeSummary.feedback.is_finalized);
    } else {
      setRating('meets_expectations');
      setStrengths('');
      setDevelopmentAreas('');
      setDiscussionSummary('');
      setIsFinalized(false);
    }
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [employeeSummary]);

  const handleMemberSelect = (member: TeamMember) => {
    setSelectedMember(member);
    setActiveTab('review');
  };

  const handleClosePanel = () => {
    setSelectedMember(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !filters.quarter) return;
    
    if (!strengths.trim() || !developmentAreas.trim()) {
      setSubmitError('Please specify both key strengths and development areas for the team member.');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(false);

    const payload: FeedbackSubmitPayload = {
      employee_id: selectedMember.id,
      quarter: filters.quarter,
      performance_rating: rating,
      strengths,
      development_areas: developmentAreas,
      discussion_summary: discussionSummary || undefined,
      is_finalized: isFinalized
    };

    submitFeedbackMutation.mutate({
      employeeId: selectedMember.id,
      payload
    }, {
      onSuccess: () => {
        setSubmitSuccess(true);
        refetchTeam();
        setTimeout(() => setSubmitSuccess(false), 3000);
      },
      onError: (err: any) => {
        setSubmitError(err?.response?.data?.detail || 'An unexpected error occurred while saving the review.');
      }
    });
  };

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter(m => {
      const matchesSearch = (m.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (m.department_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                            m.submission_status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [teamMembers, searchQuery, statusFilter]);

  const ratingLabels = {
    exceeds_expectations: { text: 'Exceeds Expectations', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    meets_expectations: { text: 'Meets Expectations', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    needs_improvement: { text: 'Needs Improvement', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager Hub
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Team Performance Engine</h1>
          <p className="text-slate-300 font-medium">Review and verify direct report objectives, performance summaries, and structured dialogs.</p>
        </div>

        {/* Quarter dropdown inside header */}
        <div className="flex items-center gap-3">
          <label className="text-slate-300 text-sm font-semibold whitespace-nowrap">Active Quarter:</label>
          <select 
            value={filters.quarter}
            onChange={(e) => setFilter('quarter', e.target.value)}
            className="bg-white/10 hover:bg-white/15 text-white font-semibold rounded-2xl px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            {quarters?.map(q => (
              <option key={q.id} value={q.label} className="text-slate-950">
                {q.label} ({q.state.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Main Grid View */}
      <div className={`grid grid-cols-1 ${selectedMember ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-6 transition-all duration-300`}>
        {/* Left Side: Directory Table */}
        <div className={`${selectedMember ? 'lg:col-span-7' : 'w-full'} space-y-4`}>
          {/* Controls & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search team member or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  statusFilter === 'all' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Reports
              </button>
              <button 
                onClick={() => setStatusFilter('submitted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  statusFilter === 'submitted' 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Submitted
              </button>
              <button 
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  statusFilter === 'approved' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Approved
              </button>
            </div>
          </div>

          {/* Directory Grid/List */}
          {teamLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-slate-500 text-sm">Compiling team directories and achievement metrics...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">No reports found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">Either you have no direct reports configured or they do not match your active search filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map((member) => (
                <div 
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                    selectedMember?.id === member.id 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl group-hover:from-indigo-500/10 transition-all"></div>
                  
                  <div>
                    {/* User profile row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform">
                          {member.full_name ? member.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{member.full_name || 'Team Member'}</h4>
                          <span className="text-slate-400 text-xs font-semibold">{member.email}</span>
                        </div>
                      </div>
                      
                      {/* Submission status pill */}
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border ${
                        member.submission_status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : member.submission_status === 'Submitted'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {member.submission_status}
                      </span>
                    </div>

                    {/* Department pill */}
                    <div className="mb-4">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {member.department_name || 'General Operations'}
                      </span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Average Goal Progress</span>
                        <span className="font-bold text-slate-800">{Math.round(member.avg_progress)}%</span>
                      </div>
                      <ProgressBar progress={member.avg_progress} />
                    </div>
                  </div>

                  {/* High-level metadata row */}
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      {member.total_goals} goal{member.total_goals !== 1 ? 's' : ''} active
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Check-in:{' '}
                      {member.last_checkin_date 
                        ? new Date(member.last_checkin_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : 'None'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Evaluation & History Panel */}
        {selectedMember && (
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[750px] animate-in slide-in-from-right-4 duration-500">
            {/* Panel Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
              {/* Decorative radial overlay */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/10 font-bold flex items-center justify-center text-sm border border-white/10">
                  {selectedMember.full_name ? selectedMember.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{selectedMember.full_name || 'Team Member'}</h3>
                  <p className="text-slate-400 text-xs font-semibold">{filters.quarter} review cycle</p>
                </div>
              </div>

              <button 
                onClick={handleClosePanel}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer relative z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Performance aggregates banner */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Weighted Performance Index</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-800">
                    {summaryLoading ? '...' : `${Math.round(employeeSummary?.weighted_achievement_score || 0)}%`}
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Submission State</span>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedMember.submission_status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedMember.submission_status === 'Submitted'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedMember.submission_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('review')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'review' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                Structured Review
              </button>
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'timeline' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Discussion & Timeline
              </button>
            </div>

            {/* Tab Contents: Scrollable panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'review' ? (
                summaryLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                    <p className="text-slate-400 text-sm">Loading performance summaries...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Goal weightings breakdown list */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        Target Weight Distribution
                      </h4>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3.5">
                        {employeeSummary?.goals?.map(g => (
                          <div key={g.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-700 truncate max-w-[200px]">{g.title}</span>
                              <span className="text-slate-400">
                                Weight: <span className="font-bold text-slate-700">{g.weightage}%</span> | Progress: <span className="font-bold text-slate-700">{g.progress}%</span>
                              </span>
                            </div>
                            <ProgressBar progress={g.progress} />
                          </div>
                        ))}
                        {(!employeeSummary?.goals || employeeSummary.goals.length === 0) && (
                          <p className="text-center text-slate-400 text-xs py-2">No active goals configured for this quarter.</p>
                        )}
                      </div>
                    </div>

                    {/* Evaluation Form / Read Only review */}
                    <div className="space-y-3 border-t border-slate-100 pt-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-indigo-500" />
                          Structured Rating Feedback
                        </h4>
                        
                        {employeeSummary?.feedback?.is_finalized && (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Finalized Review
                          </span>
                        )}
                      </div>

                      {employeeSummary?.feedback?.is_finalized ? (
                        /* Read-only finalized view */
                        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200 rounded-2xl p-5 space-y-4">
                          {/* Rating badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs font-semibold">Overall Rating:</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${ratingLabels[employeeSummary.feedback.performance_rating]?.color || ''}`}>
                              {ratingLabels[employeeSummary.feedback.performance_rating]?.text}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Core Strengths</span>
                            <p className="text-slate-700 text-sm bg-white border border-slate-100 rounded-xl p-3 shadow-xs whitespace-pre-wrap">{employeeSummary.feedback.strengths}</p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Development & Focus Areas</span>
                            <p className="text-slate-700 text-sm bg-white border border-slate-100 rounded-xl p-3 shadow-xs whitespace-pre-wrap">{employeeSummary.feedback.development_areas}</p>
                          </div>

                          {employeeSummary.feedback.discussion_summary && (
                            <div className="space-y-1">
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Discussion/1on1 Log Summary</span>
                              <p className="text-slate-700 text-sm bg-white border border-slate-100 rounded-xl p-3 shadow-xs whitespace-pre-wrap">{employeeSummary.feedback.discussion_summary}</p>
                            </div>
                          )}

                          <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Author ID: {employeeSummary.feedback.manager_id.split('-')[0]}...</span>
                            <span>Finalized: {new Date(employeeSummary.feedback.finalized_at || '').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          </div>
                        </div>
                      ) : (
                        /* Edit review form */
                        <form onSubmit={handleSubmitReview} className="space-y-4">
                          {/* Performance rating selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Quarterly Performance Rating:</label>
                            <select 
                              value={rating}
                              onChange={(e) => setRating(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                            >
                              <option value="exceeds_expectations">🚀 Exceeds Expectations</option>
                              <option value="meets_expectations">✅ Meets Expectations</option>
                              <option value="needs_improvement">⚠️ Needs Improvement</option>
                            </select>
                          </div>

                          {/* Strengths */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Key Strengths & Achievements:</label>
                            <textarea 
                              rows={3}
                              placeholder="Detail outstanding achievements, domain skills, execution speed, or proactive leadership..."
                              value={strengths}
                              onChange={(e) => setStrengths(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                          </div>

                          {/* Development areas */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Focus & Growth Areas:</label>
                            <textarea 
                              rows={3}
                              placeholder="Detail developmental points, time-management, technical capability enhancements, or organizational alignments..."
                              value={developmentAreas}
                              onChange={(e) => setDevelopmentAreas(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                          </div>

                          {/* Discussion summary */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Discussion/1on1 Summary (Optional):</label>
                            <textarea 
                              rows={2}
                              placeholder="Record comments discussed during the sync discussion, alignment feedback, or general feedback logs..."
                              value={discussionSummary}
                              onChange={(e) => setDiscussionSummary(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                          </div>

                          {/* Finalize checkbox */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <input 
                              type="checkbox"
                              id="is_finalized_checkbox"
                              checked={isFinalized}
                              onChange={(e) => setIsFinalized(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                            />
                            <label htmlFor="is_finalized_checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                              Finalize & Lock Review (Allows read-only dashboard visibility for employee)
                            </label>
                          </div>

                          {/* Action messages */}
                          {submitError && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3.5">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{submitError}</span>
                            </div>
                          )}

                          {submitSuccess && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3.5">
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                              <span>Review feedback saved successfully.</span>
                            </div>
                          )}

                          {/* Submit button */}
                          <button 
                            type="submit"
                            disabled={submitFeedbackMutation.isPending}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {submitFeedbackMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving Evaluation...
                              </>
                            ) : (
                              <>
                                <FileCheck2 className="w-4 h-4" />
                                Save Review Evaluation
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* Timeline discussion / logs view */
                historyLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                    <p className="text-slate-400 text-sm">Aggregating dialogue histories...</p>
                  </div>
                ) : !discussionHistory || discussionHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold">No discussions or activity records logged for this employee in {filters.quarter}.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-5 ml-2.5 space-y-6">
                    {discussionHistory.map((event) => (
                      <div key={event.id} className="relative group">
                        {/* Bullet point icon */}
                        <div className={`absolute -left-[31px] top-1.5 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                          event.type === 'checkin'
                            ? 'bg-blue-500'
                            : event.type === 'comment'
                            ? 'bg-purple-500'
                            : event.type === 'approval'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}></div>

                        {/* Event block */}
                        <div className="space-y-1 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 shadow-2xs hover:bg-slate-100/50 transition-colors">
                          {/* Event title */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                              {event.type === 'checkin' && 'Achievement Check-in'}
                              {event.type === 'comment' && 'Goal Discussion Comment'}
                              {event.type === 'approval' && 'Workflow Transition'}
                              {event.type === 'feedback' && 'Structured Performance Feedback'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(event.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Event content */}
                          <div className="text-xs text-slate-700 font-semibold leading-relaxed">
                            {event.type === 'checkin' && (
                              <>
                                Added achievement value <span className="text-blue-600 font-bold">{event.details.value}</span> for objective{' '}
                                <span className="text-slate-800 font-bold">"{event.goal_title}"</span>
                                {event.details.comment && (
                                  <p className="mt-1.5 italic text-slate-500 bg-white border border-slate-100 rounded-lg p-2">
                                    "{event.details.comment}"
                                  </p>
                                )}
                              </>
                            )}

                            {event.type === 'comment' && (
                              <>
                                <span className="text-slate-800 font-bold">{event.author_name}</span> commented on objective{' '}
                                <span className="text-slate-800 font-bold">"{event.goal_title}"</span>:
                                <p className="mt-1.5 text-slate-600 bg-white border border-slate-100 rounded-lg p-2 font-medium">
                                  "{event.details.content}"
                                </p>
                              </>
                            )}

                            {event.type === 'approval' && (
                              <>
                                Transited status for objective <span className="text-slate-800 font-bold">"{event.goal_title}"</span> from{' '}
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-700">{event.details.from_status}</span> to{' '}
                                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{event.details.to_status}</span>
                                {event.details.comment && (
                                  <p className="mt-1.5 italic text-slate-500 bg-white border border-slate-100 rounded-lg p-2">
                                    Comment: "{event.details.comment}"
                                  </p>
                                )}
                              </>
                            )}

                            {event.type === 'feedback' && (
                              <>
                                Finalized Structured Review Rating:{' '}
                                <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                                  {ratingLabels[event.details.performance_rating as 'meets_expectations']?.text || event.details.performance_rating}
                                </span>
                                <div className="mt-2 space-y-1.5 bg-white border border-slate-100 rounded-lg p-2.5">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Strengths</p>
                                  <p className="text-slate-600 font-medium font-sans">"{event.details.strengths}"</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
