'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { useAuditLogs, useUnlockGoal } from '@/hooks/api/useAdmin';
import { useGoals } from '@/hooks/api/useGoals';
import {
  Unlock, Shield, Search, Filter, Lock,
  Loader2, AlertTriangle, RefreshCw, CheckCircle2,
  X, ArrowRight, Target, User, Clock, FileText
} from 'lucide-react';

function UnlockModal({
  goalId,
  goalTitle,
  onClose,
  onSuccess,
}: {
  goalId: string;
  goalTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const addNotification = useAppStore(s => s.addNotification);
  const unlockMutation = useUnlockGoal();
  const [reason, setReason] = React.useState('');

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      addNotification({ type: 'warning', title: 'Justification Required', message: 'Reason must be at least 10 characters.' });
      return;
    }
    try {
      await unlockMutation.mutateAsync({ goalId, reason: reason.trim() });
      addNotification({ type: 'success', title: 'Goal Force-Unlocked', message: `"${goalTitle}" has been unlocked and the event is recorded in the audit trail.` });
      onSuccess();
      onClose();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Unlock Failed', message: err.message || 'Could not unlock this goal.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-amber-200">
        <div className="bg-amber-50 px-6 py-5 border-b border-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Force Unlock Goal</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-1">{goalTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-4 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 font-semibold leading-relaxed">
              <p className="font-black mb-1">⚠️ Irreversible Administrative Action</p>
              <p>Force-unlocking a goal will override all quarter lock controls. This action, your identity, timestamp, and justification will be permanently recorded in the enterprise audit trail. Only proceed if you have confirmed this is a legitimate exception.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
              Audit Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Mandatory: Provide a detailed reason for this administrative override (min. 10 characters)..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none transition-all font-semibold"
            />
            <p className={`text-[10px] mt-1 font-bold ${reason.trim().length < 10 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {reason.trim().length} / 10 min characters
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={unlockMutation.isPending || reason.trim().length < 10}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-40"
            >
              {unlockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Confirm Force Unlock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnlockWorkflowsPage() {
  const filters = useAppStore(s => s.filters);
  const { data: auditLogs, isLoading: logsLoading } = useAuditLogs({ action: 'FORCE_UNLOCK', size: 50 });
  const { data: goalsData, isLoading: goalsLoading, refetch } = useGoals({ quarter: filters.quarter, scope: 'team' });

  const [search, setSearch] = React.useState('');
  const [selectedGoal, setSelectedGoal] = React.useState<{ id: string; title: string } | null>(null);

  const goals = React.useMemo(() => {
    const raw = Array.isArray(goalsData) ? goalsData : (goalsData as any)?.items ?? [];
    return raw.filter((g: any) => g.is_locked || g.status === 'locked');
  }, [goalsData]);

  const filteredGoals = React.useMemo(() => {
    if (!search) return goals;
    return goals.filter((g: any) =>
      g.title?.toLowerCase().includes(search.toLowerCase()) ||
      g.thrust_area?.toLowerCase().includes(search.toLowerCase())
    );
  }, [goals, search]);

  const recentUnlocks = (auditLogs ?? []).slice(0, 10);

  return (
    <>
      {selectedGoal && (
        <UnlockModal
          goalId={selectedGoal.id}
          goalTitle={selectedGoal.title}
          onClose={() => setSelectedGoal(null)}
          onSuccess={() => { refetch(); setSelectedGoal(null); }}
        />
      )}

      <div className="space-y-8 pb-10">

        {/* Header */}
        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-amber-50/40 to-transparent rounded-r-3xl -z-10" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Unlock className="w-3 h-3" /> Unlock Workflows
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Goal Unlock Center</h2>
              <p className="text-sm text-slate-500 font-medium max-w-xl">
                Force-unlock goals that are stuck in a locked state due to quarter closures or admin overrides. Every action is permanently audited.
              </p>
            </div>
          </div>
        </section>

        {/* Immutability banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-semibold leading-normal">
            <strong>Security Policy:</strong> All force-unlock operations require a mandatory audit justification. Actions are logged with the admin's identity, IP address, and timestamp. Misuse of this feature may violate your organisation's compliance policies.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Locked Goals Panel */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" /> Locked Goals ({filteredGoals.length})
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                  Showing locked goals for {filters.quarter}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search locked goals..."
                  className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold w-52 text-slate-700"
                />
              </div>
            </div>

            <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
              {goalsLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-semibold">Loading locked goals...</span>
                </div>
              ) : filteredGoals.length === 0 ? (
                <div className="py-16 text-center space-y-2 px-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-black text-slate-700">No locked goals found</p>
                  <p className="text-xs text-slate-400">All goals in {filters.quarter} are currently in an editable state.</p>
                </div>
              ) : (
                filteredGoals.map((g: any) => (
                  <div key={g.id} className="px-5 py-4 flex items-center gap-4 hover:bg-amber-50/20 transition-colors group">
                    <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 flex-shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{g.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold">{g.thrust_area}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{g.progress ?? 0}% progress</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedGoal({ id: g.id, title: g.title })}
                      className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition-all flex-shrink-0"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Unlock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Unlock Audit Log */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> Recent Unlock Actions
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Audit trail of all force-unlock events</p>
            </div>

            <div className="flex-1 divide-y divide-slate-50">
              {logsLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : recentUnlocks.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">No unlock events recorded</p>
                </div>
              ) : (
                recentUnlocks.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {log.entity_id?.slice(0, 12)}...
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      By {log.actor_email || 'admin'} · {new Date(log.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {log.new_values?.reason && (
                      <p className="text-[10px] text-amber-700 mt-1 font-semibold italic line-clamp-2">
                        "{log.new_values.reason}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
