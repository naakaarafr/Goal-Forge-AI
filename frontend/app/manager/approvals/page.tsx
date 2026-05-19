'use client';

import React, { useState } from 'react';
import {
  usePendingApprovals,
  useApproveGoal,
  useReworkGoal,
  useGoalHistory,
  useManagerUpdateGoal,
} from '@/hooks/api/useWorkflow';
import { GoalPriority, GoalStatus, UoMType } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import {
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Target,
  Pencil,
  X,
  Save,
  Clock,
  History,
  User,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityColor(p: GoalPriority) {
  switch (p) {
    case GoalPriority.CRITICAL: return 'bg-red-100 text-red-700';
    case GoalPriority.HIGH: return 'bg-orange-100 text-orange-700';
    case GoalPriority.MEDIUM: return 'bg-blue-100 text-blue-700';
    case GoalPriority.LOW: return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Rework Modal ─────────────────────────────────────────────────────────────

function ReworkModal({
  goalTitle,
  onConfirm,
  onClose,
  isPending,
}: {
  goalTitle: string;
  onConfirm: (comment: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Return for Rework</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{goalTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            The goal will move back to <strong>DRAFT</strong> status and the employee will be notified with your comment.
          </p>
        </div>

        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Rework Notes <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Explain what needs to be changed — e.g. 'Target value is too low for Q3 ambition. Please revise to at least 85%...'"
          rows={4}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">{comment.length} characters</p>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={comment.trim().length < 10 || isPending}
            onClick={() => onConfirm(comment.trim())}
            className="flex-1 bg-orange-500 text-white font-semibold py-2.5 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Return for Rework
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approval History Panel ───────────────────────────────────────────────────

function HistoryPanel({ goalId }: { goalId: string }) {
  const { data: history, isLoading } = useGoalHistory(goalId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-4 px-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading history...</span>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 px-2 italic">No approval history yet.</p>
    );
  }

  const statusColor: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    draft: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-4 py-2">
      {history.map((entry) => (
        <li key={entry.id} className="ml-4">
          <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${statusColor[entry.to_status] || 'bg-slate-100 text-slate-600'}`}>
              {entry.from_status} → {entry.to_status}
            </span>
            <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
          </div>
          {entry.comment && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mt-1 border border-slate-100">
              &ldquo;{entry.comment}&rdquo;
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

// ─── Goal Review Card ─────────────────────────────────────────────────────────

function GoalReviewCard({ goal }: { goal: any }) {
  const addNotification = useAppStore((s) => s.addNotification);
  const approveGoal = useApproveGoal();
  const reworkGoal = useReworkGoal();
  const managerUpdate = useManagerUpdateGoal();

  const [showHistory, setShowHistory] = useState(false);
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedWeightage, setEditedWeightage] = useState<number>(goal.weightage);
  const [editedTarget, setEditedTarget] = useState<number>(goal.target_value);

  const handleApprove = async () => {
    try {
      await approveGoal.mutateAsync({ goalId: goal.id });
      addNotification({ type: 'success', title: 'Goal Approved', message: `"${goal.title}" has been approved and locked.` });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Approval Failed', message: err?.message || 'Could not approve goal.' });
    }
  };

  const handleRework = async (comment: string) => {
    try {
      await reworkGoal.mutateAsync({ goalId: goal.id, comment });
      setReworkModalOpen(false);
      addNotification({ type: 'warning', title: 'Returned for Rework', message: `"${goal.title}" has been returned to the employee for revision.` });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Action Failed', message: err?.message || 'Could not return goal.' });
    }
  };

  const handleSaveInlineEdit = async () => {
    try {
      await managerUpdate.mutateAsync({
        goalId: goal.id,
        weightage: editedWeightage !== goal.weightage ? editedWeightage : undefined,
        target_value: editedTarget !== goal.target_value ? editedTarget : undefined,
      });
      setEditMode(false);
      addNotification({ type: 'success', title: 'Goal Updated', message: 'Changes saved successfully.' });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Update Failed', message: err?.message || 'Could not save changes.' });
    }
  };

  const uomLabel: Record<string, string> = {
    numeric: '',
    percentage: '%',
    timeline: ' days',
    zero_based: '',
  };

  return (
    <>
      {reworkModalOpen && (
        <ReworkModal
          goalTitle={goal.title}
          onConfirm={handleRework}
          onClose={() => setReworkModalOpen(false)}
          isPending={reworkGoal.isPending}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${priorityColor(goal.priority)}`}>
                  {goal.priority}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-600 border border-blue-200">
                  Pending Review
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {goal.quarter}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{goal.title}</h3>
              {goal.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{goal.description}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Inline edit weightage or target"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => { setEditMode(false); setEditedWeightage(goal.weightage); setEditedTarget(goal.target_value); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}

              <button
                onClick={() => setReworkModalOpen(true)}
                disabled={reworkGoal.isPending || approveGoal.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rework
              </button>

              <button
                onClick={handleApprove}
                disabled={approveGoal.isPending || reworkGoal.isPending || editMode}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {approveGoal.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/60">
          {/* Thrust Area */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Thrust Area
            </p>
            <p className="text-sm font-bold text-slate-800">{goal.thrust_area}</p>
          </div>

          {/* Weightage */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Weightage</p>
            {editMode ? (
              <input
                type="number"
                min={10}
                max={100}
                value={editedWeightage}
                onChange={(e) => setEditedWeightage(Number(e.target.value))}
                className="w-full border-2 border-blue-400 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-300"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{goal.weightage}%</p>
            )}
          </div>

          {/* Target Value */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Target</p>
            {editMode ? (
              <input
                type="number"
                min={0}
                value={editedTarget}
                onChange={(e) => setEditedTarget(Number(e.target.value))}
                className="w-full border-2 border-blue-400 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-300"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">
                {goal.target_value}{uomLabel[goal.uom as string] || ''}
              </p>
            )}
          </div>

          {/* Employee */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Employee
            </p>
            <p className="text-sm font-bold text-slate-800 truncate">
              {goal.owner?.full_name || goal.owner_id?.slice(0, 8) + '...'}
            </p>
          </div>
        </div>

        {/* Save inline edit bar */}
        {editMode && (
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
            <p className="text-xs text-blue-700 font-medium">
              Editing weightage and target value. These changes save immediately.
            </p>
            <button
              onClick={handleSaveInlineEdit}
              disabled={managerUpdate.isPending}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {managerUpdate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-5 py-3 border-t border-slate-100">
          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <span>Current Progress</span>
            <span className="text-slate-700">{goal.progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Approval History
          </span>
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showHistory && (
          <div className="px-5 pb-4">
            <HistoryPanel goalId={goal.id} />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { data: goals, isLoading, error, refetch } = usePendingApprovals();
  const user = useAppStore((s) => s.user);

  const pendingCount = goals?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pending Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve submitted goals from your direct reports.
          </p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm rounded-xl">
                <AlertTriangle className="w-4 h-4" />
                {pendingCount} Pending
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-medium">Loading pending approvals...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center flex-col gap-3">
          <AlertTriangle className="w-8 h-8" />
          <p className="font-bold">Could not load pending approvals.</p>
          <p className="text-sm text-red-500">
            Make sure you are logged in as a manager and the backend is running.
          </p>
          <button onClick={() => refetch()} className="text-sm font-bold underline mt-1">
            Try again
          </button>
        </div>
      ) : pendingCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center gap-4 shadow-sm">
          <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">All caught up!</h3>
            <p className="text-sm text-slate-500 mt-2">
              No goals are currently pending your review. Check back when your team submits their quarterly goals.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
            <ClipboardList className="w-4 h-4" />
            {pendingCount} goal{pendingCount !== 1 ? 's' : ''} awaiting your decision
          </div>

          {goals!.map((goal) => (
            <GoalReviewCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
