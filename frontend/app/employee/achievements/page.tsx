'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuarters, QuarterState } from '@/hooks/api/useQuarters';
import { useAchievements, useSaveAchievementDraft, useSubmitAchievement, Achievement } from '@/hooks/api/useAchievements';
import { useGoals, TrackingStatus } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import { 
  CheckCircle2, Clock, Target, Save, Send, 
  AlertTriangle, Loader2, ChevronRight, BarChart3,
  MessageSquare, TrendingUp, Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export default function AchievementsPage() {
  const filters = useAppStore(state => state.filters);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const setFilter = useAppStore(state => state.setFilter);
  const addNotification = useAppStore(state => state.addNotification);
  
  const { data: quarters } = useQuarters();

  // Automatically default the selected quarter filter on load
  useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);
  
  const activeQuarter = quarters?.find(q => q.label === filters.quarter) || quarters?.find(q => q.state === 'active') || quarters?.[0];
  
  const { data: goals, isLoading: goalsLoading } = useGoals({ quarter: filters.quarter });
  const { data: achievements, isLoading: achievementsLoading } = useAchievements(activeQuarter?.id || null);
  
  const saveDraft = useSaveAchievementDraft();
  const submitAchievement = useSubmitAchievement();
  
  const [localDrafts, setLocalDrafts] = useState<Record<string, Partial<Achievement>>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Store active timeout references per goalId to properly debounce autosave requests
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Clear any pending timeouts on component unmount to prevent memory leaks or stray network requests
  useEffect(() => {
    const activeTimeouts = timeoutRefs.current;
    return () => {
      Object.values(activeTimeouts).forEach(clearTimeout);
    };
  }, []);

  // Sync achievements to local state for editing
  useEffect(() => {
    if (achievements) {
      const drafts: Record<string, Partial<Achievement>> = {};
      achievements.forEach(a => {
        drafts[a.goal_id] = a;
      });
      setLocalDrafts(drafts);
    }
  }, [achievements]);

  // Autosave logic
  const performAutosave = useCallback(async (goalId: string, draft: any) => {
    if (!activeQuarter) return;
    // Sanitize actual_value: parseFloat of an empty string returns NaN which
    // causes Pydantic to reject the request with a 422 Validation Error.
    const actualValue = typeof draft.actual_value === 'number' && !isNaN(draft.actual_value)
      ? draft.actual_value
      : 0;
    try {
      await saveDraft.mutateAsync({
        goal_id: goalId,
        quarter_id: activeQuarter.id,
        actual_value: actualValue,
        status: draft.status || TrackingStatus.NOT_STARTED,
        employee_summary: draft.employee_summary || '',
        version_id: draft.version_id
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Autosave failed', err);
    }
  }, [activeQuarter, saveDraft]);

  const handleUpdateDraft = (goalId: string, field: string, value: any) => {
    // Sanitize numeric fields coming from input[type=number] to avoid NaN
    const sanitizedValue = field === 'actual_value'
      ? (isNaN(value) ? '' : value)
      : value;
    const updated = {
      ...localDrafts[goalId],
      [field]: sanitizedValue
    };
    setLocalDrafts(prev => ({ ...prev, [goalId]: updated }));
    
    // Clear any previous scheduled autosave for this specific goal
    if (timeoutRefs.current[goalId]) {
      clearTimeout(timeoutRefs.current[goalId]);
    }

    // Schedule debounced autosave
    timeoutRefs.current[goalId] = setTimeout(() => {
      performAutosave(goalId, updated);
      delete timeoutRefs.current[goalId];
    }, 2000);
  };

  const handleSubmit = async (achievementId: string) => {
    try {
      await submitAchievement.mutateAsync(achievementId);
      addNotification({
        type: 'success',
        title: 'Achievement Submitted',
        message: 'Your quarterly update has been locked and sent for review.'
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: err?.message || 'Failed to submit achievement.'
      });
    }
  };

  const isLoading = goalsLoading || achievementsLoading;

  const goalList = Array.isArray(goals) ? goals : [];
  const totalGoals = goalList.length;
  
  let completedCount = 0;
  let onTrackCount = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  goalList.forEach(goal => {
    const ach = localDrafts[goal.id];
    if (ach?.status === TrackingStatus.COMPLETED) completedCount++;
    if (ach?.status === TrackingStatus.ON_TRACK || ach?.status === TrackingStatus.COMPLETED) onTrackCount++;
    if (ach?.score !== undefined && ach?.score !== null) {
      scoreSum += ach.score;
      scoredCount++;
    }
  });

  const completionPercent = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0;
  const avgScore = scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : '0.0';
  const velocity = totalGoals > 0 ? Math.round((onTrackCount / totalGoals) * 100) : 0;

  const exportToPDF = async () => {
    const input = document.getElementById('pdf-report-content');
    if (!input) return;

    setIsGeneratingPdf(true);
    try {
      const imgData = await toPng(input, {
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
        fontEmbedCSS: '', // Disables external web font parsing to prevent CORS SecurityError
        filter: (node) => {
          if (node instanceof HTMLElement && node.hasAttribute('data-html2canvas-ignore')) {
            return false;
          }
          return true;
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (input.offsetHeight * pdfWidth) / input.offsetWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Use arraybuffer + explicit MIME type to force correct .pdf extension
      const pdfArrayBuffer = pdf.output('arraybuffer');
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `Quarterly-Checkin-${filters.quarter || 'Report'}.pdf`;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      // Delay revocation so browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      addNotification({
        type: 'error',
        title: 'PDF Generation Failed',
        message: err?.message || String(err) || 'There was an error generating your PDF report.'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div id="pdf-report-content" className="space-y-8 animate-in fade-in duration-700 bg-slate-50 p-2 sm:p-4 rounded-3xl -m-2 sm:-m-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quarterly Check-in</h1>
          <p className="text-slate-500 font-medium mt-1">
            Log your achievements and track progress for {filters.quarter}.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span data-html2canvas-ignore="true" className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 
              Last autosaved: {lastSaved.toLocaleTimeString()}
            </span>
          )}

          {/* Quarter Selector */}
          <div data-html2canvas-ignore="true" className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center shadow-sm">
            <select 
              value={filters.quarter}
              onChange={(e) => setFilter('quarter', e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {quarters?.map(q => (
                <option key={q.id} value={q.label}>{q.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Quarter State</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${
              activeQuarter?.state === QuarterState.REVIEW ? 'bg-amber-100 text-amber-700' : 
              activeQuarter?.state === QuarterState.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {activeQuarter?.state || 'Planning'}
            </span>
          </div>
        </div>
      </div>

      {/* Strategic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary-container rounded-3xl p-8 text-on-primary shadow-lg relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest opacity-80">Strategic Momentum</span>
                </div>
                <h2 className="text-3xl font-black mb-4">You've completed {completionPercent}% of your quarterly targets.</h2>
                <p className="text-on-primary/80 font-medium max-w-md mb-8">
                    Maintain this velocity to ensure all "High Priority" initiatives are finalized before the review window closes.
                </p>
                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl">
                        <p className="text-xs font-bold uppercase opacity-60">Avg. Score</p>
                        <p className="text-2xl font-black">{avgScore}%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl">
                        <p className="text-xs font-bold uppercase opacity-60">On Track</p>
                        <p className="text-2xl font-black">{onTrackCount} / {totalGoals}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Quarterly Progress
                </h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Aggregate achievement across all active goals.</p>
                
                <div className="space-y-6">
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <span className="text-xs font-black inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/10">
                                Global Velocity
                            </span>
                            <span className="text-sm font-black text-slate-900">
                                {velocity}%
                            </span>
                        </div>
                        <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100">
                            <div style={{ width: `${velocity}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary rounded-full transition-all duration-1000"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={exportToPDF}
                disabled={isGeneratingPdf}
                data-html2canvas-ignore="true"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Download PDF Report'}
                {!isGeneratingPdf && <ChevronRight className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {/* Achievements List */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
            <h3 className="text-xl font-bold text-slate-800">My Targets & Achievements</h3>
        </div>

        {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-slate-500 font-bold">Synchronizing achievement data...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-8">
                {(Array.isArray(goals) ? goals : []).map((goal: any) => {
                    const achievement = localDrafts[goal.id];
                    const isSubmitted = achievement?.is_submitted;
                    
                    return (
                        <div key={goal.id} className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all ${isSubmitted ? 'opacity-90 grayscale-[0.2]' : 'hover:shadow-md'}`}>
                            <div className="p-8">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Goal Info Column */}
                                    <div className="lg:w-1/3 space-y-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                                                    {goal.thrust_area}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                    goal.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {goal.priority}
                                                </span>
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 leading-tight mb-2">{goal.title}</h4>
                                            <p className="text-slate-500 text-sm font-medium line-clamp-2">{goal.description}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Value</p>
                                                <p className="text-xl font-black text-slate-900">{goal.target_value}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Current (Goal)</p>
                                                <p className="text-xl font-black text-primary">{goal.current_value}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interaction Column */}
                                    <div className="lg:w-2/3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-8 flex flex-col gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Actual Achievement Input */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Actual Achievement</label>
                                                <div className="relative group">
                                                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <input 
                                                        type="number"
                                                        value={achievement?.actual_value !== undefined && achievement?.actual_value !== null && !isNaN(achievement.actual_value as number) ? achievement.actual_value : ''}
                                                        onChange={(e) => {
                                                          const raw = e.target.value;
                                                          // Pass empty string or parsed float; sanitization happens in handleUpdateDraft
                                                          handleUpdateDraft(goal.id, 'actual_value', raw === '' ? NaN : parseFloat(raw));
                                                        }}
                                                        disabled={isSubmitted || activeQuarter?.state !== QuarterState.REVIEW}
                                                        placeholder="Enter final value..."
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Status Selector */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Outcome Status</label>
                                                <div className="relative group">
                                                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <select 
                                                        value={achievement?.status || TrackingStatus.NOT_STARTED}
                                                        onChange={(e) => handleUpdateDraft(goal.id, 'status', e.target.value)}
                                                        disabled={isSubmitted || activeQuarter?.state !== QuarterState.REVIEW}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary focus:bg-white outline-none appearance-none transition-all disabled:opacity-50"
                                                    >
                                                        <option value={TrackingStatus.NOT_STARTED}>Not Started</option>
                                                        <option value={TrackingStatus.ON_TRACK}>On Track</option>
                                                        <option value={TrackingStatus.COMPLETED}>Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary TextArea */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Achievement Summary & Comments</label>
                                            <div className="relative">
                                                <MessageSquare className="absolute left-4 top-5 w-5 h-5 text-slate-400" />
                                                <textarea 
                                                    rows={3}
                                                    value={achievement?.employee_summary || ''}
                                                    onChange={(e) => handleUpdateDraft(goal.id, 'employee_summary', e.target.value)}
                                                    disabled={isSubmitted || activeQuarter?.state !== QuarterState.REVIEW}
                                                    placeholder="Describe what was accomplished, key challenges, and results..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 font-medium text-slate-700 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-none disabled:opacity-50"
                                                ></textarea>
                                            </div>
                                        </div>

                                        {/* Submission Actions */}
                                        <div className="flex items-center justify-between pt-4">
                                            <div className="flex items-center gap-4">
                                                {achievement?.score !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-400 uppercase">Calc. Score:</span>
                                                        <span className="text-lg font-black text-primary">{achievement.score.toFixed(1)}%</span>
                                                    </div>
                                                )}
                                                {isSubmitted && (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                                                    </span>
                                                )}
                                            </div>

                                            {!isSubmitted && (
                                                <button 
                                                    onClick={() => achievement?.id && handleSubmit(achievement.id)}
                                                    disabled={!achievement?.employee_summary || achievement.employee_summary.length < 10 || activeQuarter?.state !== QuarterState.REVIEW || submitAchievement.isPending}
                                                    className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                                >
                                                    {submitAchievement.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                                                    Submit for Review
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Manager Feedback Footer (if exists) */}
                            {achievement?.manager_feedback && (
                                <div className="bg-slate-50 border-t border-slate-100 p-6 flex gap-4">
                                    <div className="bg-primary/10 p-3 rounded-2xl h-fit">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Manager Feedback</p>
                                        <p className="text-sm font-medium text-slate-700 italic">"{achievement.manager_feedback}"</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {(Array.isArray(goals) ? goals : []).length === 0 && (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                            <Target className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No active goals for this quarter</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto">
                            You need to have approved goals for this quarter before you can track achievements.
                        </p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
