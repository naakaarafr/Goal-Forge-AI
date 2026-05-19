'use client';

import React from 'react';
import { useAppStore } from '@/store';
import { useEscalations, useUnlockGoal } from '@/hooks/api/useAdmin';
import {
  AlertOctagon, Shield, Clock, CheckCircle2, X,
  Unlock, Loader2, AlertTriangle, RefreshCw,
  User, Target, ChevronRight, MessageSquare
} from 'lucide-react';

const priorityConfig: Record<string, { color: string; dot: string }> = {
  critical: { color: 'bg-rose-100 text-rose-700 border-rose-200',    dot: 'bg-rose-500' },
  high:     { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  medium:   { color: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  low:      { color: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open:     { label: 'Open',     color: 'bg-rose-50 text-rose-700 border-rose-200' },
  pending:  { label: 'Pending',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed:   { label: 'Closed',   color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function EscalationCard({ esc, onUnlocked }: { esc: any; onUnlocked: () => void }) {
  const addNotification = useAppStore(s => s.addNotification);
  const unlockMutation = useUnlockGoal();

  const [showUnlock, setShowUnlock] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const pc = priorityConfig[esc.priority?.toLowerCase()] ?? priorityConfig.low;
  const sc = statusConfig[esc.status?.toLowerCase()] ?? statusConfig.open;
  const isActionable = esc.status === 'open' || esc.status === 'pending';

  const handleUnlock = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      addNotification({ type: 'warning', title: 'Justification Required', message: 'Please provide at least 10 characters as an unlock reason.' });
      return;
    }
    try {
      await unlockMutation.mutateAsync({ goalId: esc.goal_id, reason: reason.trim() });
      addNotification({ type: 'success', title: 'Goal Unlocked', message: `Goal "${esc.goal_title || esc.goal_id}" has been force-unlocked.` });
      setShowUnlock(false);
      setReason('');
      onUnlocked();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Unlock Failed', message: err.message || 'Could not unlock goal.' });
    }
  };

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
      isActionable ? 'border-rose-200' : 'border-slate-100'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b flex items-start justify-between gap-3 ${isActionable ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/40 border-slate-100'}`}>
        <div className="flex items-start gap-3">
          <AlertOctagon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isActionable ? 'text-rose-600' : 'text-slate-400'}`} />
          <div>
            <h4 className="text-sm font-black text-slate-800 leading-snug">{esc.goal_title || `Goal ${(esc.goal_id ?? '').slice(0, 8)}`}</h4>
            {esc.employee_name && (
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" /> {esc.employee_name}
                {esc.employee_email && <span>· {esc.employee_email}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {esc.priority && (
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1 ${pc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              {esc.priority}
            </span>
          )}
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${sc.color}`}>
            {sc.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-slate-50">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quarter</p>
          <p className="font-bold text-slate-700">{esc.quarter || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reason</p>
          <p className="font-bold text-slate-700 line-clamp-2">{esc.reason || esc.escalation_type || '—'}</p>
        </div>
        {esc.manager_name && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Manager</p>
            <p className="font-bold text-slate-700">{esc.manager_name}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Raised</p>
          <p className="font-bold text-slate-700">
            {esc.created_at ? new Date(esc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      {isActionable && !showUnlock && (
        <div className="px-5 py-3 flex gap-3">
          {esc.goal_id && (
            <button
              onClick={() => setShowUnlock(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-xl transition-all"
            >
              <Unlock className="w-3.5 h-3.5" /> Force Unlock Goal
            </button>
          )}
        </div>
      )}

      {/* Unlock Justification Form */}
      {showUnlock && (
        <div className="px-5 pb-5 space-y-3 border-t border-amber-100 bg-amber-50/30 pt-4">
          <div className="flex items-center gap-2 text-xs font-black text-amber-800">
            <AlertTriangle className="w-4 h-4" /> Admin Unlock Justification Required
          </div>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Provide a mandatory audit reason for this force-unlock (min. 10 characters)..."
            className="w-full border border-amber-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none transition-all font-semibold bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUnlock}
              disabled={unlockMutation.isPending || reason.trim().length < 10}
              className="flex items-center gap-1.5 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl transition-all disabled:opacity-40"
            >
              {unlockMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
              Confirm Unlock
            </button>
            <button
              onClick={() => { setShowUnlock(false); setReason(''); }}
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EscalationCenterPage() {
  const { data: escalations, isLoading, error, refetch } = useEscalations();

  const all = escalations ?? [];
  const open = all.filter((e: any) => e.status === 'open' || e.status === 'pending');
  const resolved = all.filter((e: any) => e.status === 'resolved' || e.status === 'closed');

  const [tab, setTab] = React.useState<'open' | 'all'>('open');
  const displayed = tab === 'open' ? open : all;

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-rose-50/40 to-transparent rounded-r-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-3 h-3" /> Escalation Center
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Escalation Management</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Review, triage, and resolve escalated goal issues across the organisation. Force-unlock goals that are stuck in locked states.
            </p>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </section>

      {/* KPI Summary */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Escalations', value: all.length,      icon: AlertOctagon, color: 'text-slate-700',  bg: 'bg-slate-50' },
          { label: 'Requires Action',   value: open.length,     icon: Clock,        color: 'text-rose-700',   bg: 'bg-rose-50' },
          { label: 'Resolved / Closed', value: resolved.length, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.label}</span>
              <div className={`${k.bg} p-2 rounded-xl ${k.color} group-hover:scale-110 transition-transform`}>
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </section>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/20">
        {(['open', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'open' ? `Requires Action (${open.length})` : `All Escalations (${all.length})`}
          </button>
        ))}
      </div>

      {/* Escalation list */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold">Loading escalations...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-700 font-bold text-sm text-center">
          Failed to load escalations. Ensure the backend is running.
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-sm font-black text-slate-700">All clear!</p>
          <p className="text-xs text-slate-400">No escalations require action at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((esc: any) => (
            <EscalationCard key={esc.id} esc={esc} onUnlocked={() => refetch()} />
          ))}
        </div>
      )}

    </div>
  );
}
