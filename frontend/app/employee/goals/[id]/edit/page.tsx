'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useRouter, useParams } from 'next/navigation';
import {
  X, Check, FileEdit, ArrowRight, Sparkles,
  Ruler, Wand2, Loader2, Save, AlertTriangle, Trash2
} from 'lucide-react';
import { z } from 'zod';
import { useGetGoal, useUpdateGoal, useDeleteGoal, GoalPriority, GoalStatus, UoMType, ACTIVE_QUARTER } from '@/hooks/api/useGoals';
import { useAnalyzeGoal, AIAnalysisResponse } from '@/hooks/api/useAI';
import { useAppStore } from '@/store';

const goalSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  thrust_area: z.string().min(1).max(100),
  uom: z.nativeEnum(UoMType),
  priority: z.nativeEnum(GoalPriority),
  weightage: z.number().min(10).max(100),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  target_value: z.number().min(0),
  current_value: z.number().min(0),
});

type GoalFormState = z.infer<typeof goalSchema>;

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;
  const addNotification = useAppStore(state => state.addNotification);

  const { data: goal, isLoading, error } = useGetGoal(goalId);

  const [step, setStep] = useState(1);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState<GoalFormState>({
    title: '',
    description: '',
    thrust_area: 'Revenue Growth',
    uom: UoMType.NUMERIC,
    priority: GoalPriority.MEDIUM,
    weightage: 10,
    quarter: ACTIVE_QUARTER,
    target_value: 0,
    current_value: 0,
  });

  const [aiData, setAiData] = useState<AIAnalysisResponse | null>(null);

  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const analyzeGoal = useAnalyzeGoal();

  const isMounted = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Pre-populate form once the goal data is fetched
  useEffect(() => {
    if (goal && !initialized) {
      setForm({
        title: goal.title,
        description: goal.description || '',
        thrust_area: goal.thrust_area,
        uom: goal.uom,
        priority: goal.priority,
        weightage: goal.weightage,
        quarter: goal.quarter,
        target_value: goal.uom === UoMType.ZERO_BASED ? 1 : goal.target_value,
        current_value: goal.current_value,
      });
      setInitialized(true);
    }
  }, [goal, initialized]);

  // Auto-save logic (debounced) — only after initialization
  useEffect(() => {
    if (!initialized) return;
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (form.title.length < 3) return;

    setSaveState('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await updateGoal.mutateAsync({ id: goalId, data: form });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('idle');
      }
    }, 1000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [form, initialized]);

  const handleChange = (field: keyof GoalFormState, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'uom' && value === UoMType.ZERO_BASED) {
        next.target_value = 1;
        if (next.current_value > 1) next.current_value = 1;
      }
      return next;
    });
  };

  const handleAutoRefine = async () => {
    if (!form.title && !form.description) {
      addNotification({ type: 'warning', title: 'Input required', message: 'Please provide a title or description first.' });
      return;
    }
    try {
      const res = await analyzeGoal.mutateAsync({
        title: form.title,
        description: form.description,
        thrust_area: form.thrust_area
      });
      setAiData(res);
      if (res.refined_goal) {
        handleChange('description', res.refined_goal);
        addNotification({ type: 'success', title: 'AI Refined', message: 'Your description has been enhanced.' });
      } else if (res.clarity_score > 0) {
        addNotification({ type: 'success', title: 'Analysis Complete', message: `Clarity Score: ${res.clarity_score}/100. See suggestions on the right.` });
      } else {
        // clarity_score 0 means AI returned an error fallback
        addNotification({ type: 'warning', title: 'AI Analysis Issue', message: 'AI could not analyze the goal. Check that the backend is running.' });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'AI Error', message: err?.message || 'Could not connect to the AI service. Is the backend running on port 8000?' });
    }
  };

  const handleSaveAndExit = async () => {
    const result = goalSchema.safeParse(form);
    if (!result.success) {
      addNotification({ type: 'error', title: 'Validation Error', message: 'Please ensure all required fields are filled correctly.' });
      return;
    }
    try {
      await updateGoal.mutateAsync({ id: goalId, data: form });
      addNotification({ type: 'success', title: 'Draft Saved', message: 'Your goal has been updated successfully.' });
      router.push('/employee/goals');
    } catch {
      addNotification({ type: 'error', title: 'Save Failed', message: 'Could not save your goal. Please try again.' });
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }
    
    try {
      console.log('[GoalForge] Deleting goal:', goalId);
      await deleteGoal.mutateAsync(goalId);
      addNotification({ type: 'success', title: 'Goal Deleted', message: 'Your goal has been permanently removed.' });
      router.push('/employee/goals');
    } catch (err: any) {
      console.error('[GoalForge] Delete failed:', err);
      addNotification({ type: 'error', title: 'Delete Failed', message: err?.message || 'Could not delete your goal. Please try again.' });
      setShowDeleteConfirm(false);
    }
  };

  // — Loading / Error states —
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 flex-col gap-4 text-on-surface-variant">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium">Loading goal...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="flex items-center justify-center py-32 flex-col gap-4 text-on-error-container bg-error-container rounded-2xl m-8">
        <AlertTriangle className="w-10 h-10" />
        <p className="font-bold text-lg">Goal not found or failed to load.</p>
        <button onClick={() => router.push('/employee/goals')} className="text-sm underline">
          Back to Goals
        </button>
      </div>
    );
  }

  // Prevent editing non-draft goals
  if (goal.status !== GoalStatus.DRAFT) {
    return (
      <div className="flex items-center justify-center py-32 flex-col gap-4 text-on-surface-variant bg-surface rounded-2xl m-8 border border-outline-variant">
        <AlertTriangle className="w-10 h-10 text-orange-500" />
        <p className="font-bold text-lg text-on-surface">This goal cannot be edited</p>
        <p className="text-sm text-center max-w-sm">
          Only goals in <strong>Draft</strong> status can be edited. This goal is currently <strong>{goal.status}</strong>.
        </p>
        <button
          onClick={() => router.push('/employee/goals')}
          className="mt-2 px-6 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold"
        >
          Back to Goals
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Edit Draft Goal
            {saveState === 'saving' && (
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveState === 'saved' && (
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-full">
                <Save className="w-3 h-3" /> Draft saved
              </span>
            )}
          </h1>
          <p className="text-lg text-slate-600 mt-1">Editing: <span className="font-semibold text-slate-800">{goal.title}</span></p>
          {goal.parent_id && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900 uppercase tracking-tight">Departmental Shared Goal</p>
                <p className="text-xs text-blue-700 leading-snug">This goal is a departmental KPI. The title, thrust area, and targets are managed by your manager. You can only adjust your individual weightage and priority.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDelete}
            disabled={deleteGoal.isPending}
            className={`${
              showDeleteConfirm 
                ? 'bg-red-500 text-white px-3 py-1 rounded-lg' 
                : 'text-red-500 hover:text-red-600'
            } flex items-center gap-1 text-sm font-semibold transition-all duration-200 disabled:opacity-50`}
          >
            {deleteGoal.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {showDeleteConfirm ? 'Confirm Delete?' : 'Delete'}
          </button>
          <button
            onClick={() => router.push('/employee/goals')}
            className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm font-semibold transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Area: Wizard */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          {/* Stepper */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500"
                style={{ width: `${(step - 1) * 33.33}%` }}
              ></div>

              {['Thrust Area', 'Details', 'Metrics', 'Review'].map((label, index) => {
                const s = index + 1;
                return (
                  <div key={s} className="relative z-10 flex flex-col items-center gap-2 w-1/4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
                      s < step ? 'bg-blue-600 text-white' :
                      s === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                      'bg-white border-2 border-slate-200 text-slate-400'
                    }`}>
                      {s < step ? <Check className="w-4 h-4" /> : s}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${s === step ? 'text-blue-600' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col gap-8 hover:shadow-md transition-shadow min-h-[400px]">
            <div className="flex items-center gap-2 mb-2">
              <FileEdit className="text-blue-600 w-5 h-5" />
              <h2 className="text-xl font-bold text-slate-900">
                {step === 1 && "Select Thrust Area"}
                {step === 2 && "Goal Details"}
                {step === 3 && "Metrics & Priority"}
                {step === 4 && "Review & Save"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1">
              {step === 1 && (
                <div className="flex flex-col gap-6 col-span-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">Thrust Area <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-500 mb-2">Select the strategic pillar this goal aligns with.</p>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={form.thrust_area}
                      onChange={(e) => handleChange('thrust_area', e.target.value)}
                      disabled={!!goal.parent_id}
                    >
                      <option value="Revenue Growth">Revenue Growth</option>
                      <option value="Operational Efficiency">Operational Efficiency</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="Innovation">Innovation</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">Quarter <span className="text-red-500">*</span></label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900"
                      value={form.quarter}
                      onChange={(e) => handleChange('quarter', e.target.value)}
                    >
                      <option value="2024-Q1">2024-Q1</option>
                      <option value="2024-Q2">2024-Q2</option>
                      <option value="2024-Q3">2024-Q3</option>
                      <option value="2024-Q4">2024-Q4</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-semibold text-slate-900">Goal Title <span className="text-red-500">*</span></label>
                    <input
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={form.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g., Expand Market Share in EMEA"
                      disabled={!!goal.parent_id}
                    />
                  </div>

                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-semibold text-slate-900 flex justify-between items-center">
                      Description
                      <button
                        onClick={handleAutoRefine}
                        disabled={analyzeGoal.isPending}
                        className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {analyzeGoal.isPending
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                          : <><Sparkles className="w-3 h-3 fill-current" /> Auto-generate</>}
                      </button>
                    </label>
                    <textarea
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm resize-none text-slate-900 placeholder:text-slate-400"
                      rows={5}
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Provide context, key deliverables, and strategic alignment..."
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">Priority <span className="text-red-500">*</span></label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900"
                      value={form.priority}
                      onChange={(e) => handleChange('priority', e.target.value as GoalPriority)}
                    >
                      <option value={GoalPriority.LOW}>Low</option>
                      <option value={GoalPriority.MEDIUM}>Medium</option>
                      <option value={GoalPriority.HIGH}>High</option>
                      <option value={GoalPriority.CRITICAL}>Critical</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">Weightage (%) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900"
                      value={form.weightage}
                      onChange={(e) => { const v = parseInt(e.target.value); handleChange('weightage', isNaN(v) ? 10 : Math.max(10, v)); }}
                    />
                  </div>

                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-semibold text-slate-900">Unit of Measurement <span className="text-red-500">*</span></label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={form.uom}
                      onChange={(e) => handleChange('uom', e.target.value as UoMType)}
                      disabled={!!goal.parent_id}
                    >
                      <option value={UoMType.NUMERIC}>Numeric (0-100)</option>
                      <option value={UoMType.PERCENTAGE}>Percentage (%)</option>
                      <option value={UoMType.TIMELINE}>Timeline (Dates)</option>
                      <option value={UoMType.ZERO_BASED}>Zero-Based (Pass/Fail)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Target Value {form.uom === UoMType.PERCENTAGE ? '(%)' : form.uom === UoMType.TIMELINE ? '(Days)' : ''}
                    </label>
                    {form.uom === UoMType.ZERO_BASED ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500 font-medium">
                        Pass (1.0)
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        value={form.target_value}
                        onChange={(e) => handleChange('target_value', parseFloat(e.target.value) || 0)}
                        disabled={!!goal.parent_id}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Current Value {form.uom === UoMType.PERCENTAGE ? '(%)' : form.uom === UoMType.TIMELINE ? '(Days)' : ''}
                    </label>
                    {form.uom === UoMType.ZERO_BASED ? (
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900"
                        value={form.current_value}
                        onChange={(e) => handleChange('current_value', parseFloat(e.target.value))}
                      >
                        <option value={0}>Fail (0.0)</option>
                        <option value={1}>Pass (1.0)</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm text-slate-900"
                        value={form.current_value}
                        onChange={(e) => handleChange('current_value', parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-3 col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-700 uppercase tracking-wider">
                      <span>Calculated Progress</span>
                      <span>{form.target_value > 0 ? Math.min(100, Math.round((form.current_value / form.target_value) * 100)) : 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${form.target_value > 0 ? Math.min(100, (form.current_value / form.target_value) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <div className="col-span-2 flex flex-col gap-4">
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
                    <div>
                      <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Goal Title</h4>
                      <p className="text-lg font-bold text-slate-900 mt-1">{form.title || 'Untitled Goal'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Description</h4>
                      <p className="text-sm text-slate-700 mt-1">{form.description || 'No description provided.'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-200">
                      <div>
                        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Thrust Area</h4>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{form.thrust_area}</p>
                      </div>
                      <div>
                        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Priority</h4>
                        <p className="text-sm font-semibold text-slate-900 mt-1 uppercase">{form.priority}</p>
                      </div>
                      <div>
                        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Weightage</h4>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{form.weightage}%</p>
                      </div>
                      <div>
                        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Quarter</h4>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{form.quarter}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 text-center">
                    Review your changes above. Click <strong>Save Draft</strong> to update your goal.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-200">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                className="px-6 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>

              {step === 4 ? (
                <button
                  onClick={handleSaveAndExit}
                  disabled={updateGoal.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {updateGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>
              ) : (
                <button
                  onClick={() => setStep(Math.min(4, step + 1))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: AI Assist Panel */}
        <aside className="xl:col-span-4 h-full sticky top-[88px]">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-md relative overflow-hidden h-full min-h-[600px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="w-5 h-5 fill-current" />
                <h3 className="text-lg font-bold">AI Assist</h3>
              </div>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Live Analysis</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-600">Clarity Score</span>
                <span className="text-xl font-bold text-slate-900">{aiData?.clarity_score || '--'}<span className="text-xs text-slate-400 font-normal">/100</span></span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${aiData?.clarity_score || 0}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 leading-tight">
                {aiData?.clarity_score
                  ? (aiData.clarity_score > 80 ? 'Great goal formulation!' : 'AI can help refine this into a SMART goal.')
                  : 'Click Auto-Refine for an AI-powered analysis.'}
              </p>
            </div>

            <hr className="border-slate-200 relative z-10" />

            <div className="flex flex-col gap-4 relative z-10 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-900">SMART Improvements</h4>

              {!aiData && (
                <div className="text-sm text-slate-400 text-center py-10 opacity-70">
                  <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-300" />
                  No analysis yet.
                </div>
              )}

              {aiData?.suggestions?.map((sug, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border-l-4 border-l-orange-500 border border-slate-200 shadow-sm flex gap-3 items-start">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Ruler className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-900">{sug.title}</span>
                    <p className="text-xs text-slate-600">{sug.description}</p>
                    {sug.actionable_text && (
                      <button
                        onClick={() => handleChange('description', sug.actionable_text!)}
                        className="text-[10px] font-bold text-blue-600 hover:underline w-fit mt-1"
                      >
                        Apply Suggestion
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 relative z-10">
              <button
                onClick={handleAutoRefine}
                disabled={analyzeGoal.isPending}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {analyzeGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {analyzeGoal.isPending ? 'Analyzing...' : 'Auto-Refine Goal'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
