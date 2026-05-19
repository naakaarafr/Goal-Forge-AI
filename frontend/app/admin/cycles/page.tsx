'use client';

import React from 'react';
import { useQuartersAdmin, useUpdateQuarter, Quarter } from '@/hooks/api/useAdmin';
import { useAppStore } from '@/store';
import {
  Calendar, Lock, Unlock, RefreshCw, ChevronRight,
  CheckCircle2, Clock, ArrowRight, Loader2, AlertTriangle,
  Edit3, Shield, Zap, Archive
} from 'lucide-react';

const stateFlow: Record<string, { next: string; label: string; color: string }> = {
  planning: { next: 'active',  label: 'Activate Quarter', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  active:   { next: 'review',  label: 'Move to Review',   color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  review:   { next: 'closed',  label: 'Close Quarter',    color: 'bg-slate-700 hover:bg-slate-800 text-white' },
  closed:   { next: '',        label: 'Archived',          color: 'bg-slate-100 text-slate-400 cursor-not-allowed' },
};

const stateConfig: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  planning: { label: 'Planning',  color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500',    icon: Edit3 },
  active:   { label: 'Active',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Zap },
  review:   { label: 'In Review', color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500',   icon: Clock },
  closed:   { label: 'Closed',    color: 'bg-slate-100 text-slate-500 border-slate-200',  dot: 'bg-slate-400',   icon: Archive },
};

function QuarterCard({ quarter }: { quarter: Quarter }) {
  const addNotification = useAppStore(s => s.addNotification);
  const updateQ = useUpdateQuarter();
  const [confirmAction, setConfirmAction] = React.useState<null | 'advance' | 'lock' | 'unlock'>(null);

  const cfg = stateConfig[quarter.state] ?? stateConfig.closed;
  const flow = stateFlow[quarter.state];
  const Icon = cfg.icon;

  const handleAdvance = async () => {
    if (!flow.next) return;
    try {
      await updateQ.mutateAsync({ id: quarter.id, state: flow.next });
      addNotification({ type: 'success', title: 'Quarter Updated', message: `${quarter.label} moved to ${flow.next}.` });
      setConfirmAction(null);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Update Failed', message: err.message || 'Could not update quarter state.' });
    }
  };

  const handleToggleLock = async () => {
    try {
      await updateQ.mutateAsync({ id: quarter.id, is_immutable: !quarter.is_immutable });
      addNotification({
        type: quarter.is_immutable ? 'info' : 'warning',
        title: quarter.is_immutable ? 'Quarter Unlocked' : 'Quarter Locked',
        message: `${quarter.label} is now ${quarter.is_immutable ? 'editable' : 'immutable'}.`
      });
      setConfirmAction(null);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Lock Failed', message: err.message || 'Could not toggle immutability.' });
    }
  };

  return (
    <div className={`bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all ${quarter.state === 'active' ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-100'}`}>
      
      {/* Card header */}
      <div className={`px-6 py-4 border-b ${quarter.state === 'active' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/40 border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${cfg.color.split(' ')[0]} ${cfg.color.split(' ')[1]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{quarter.label}</h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                {new Date(quarter.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(quarter.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${cfg.color}`}>
              {cfg.label}
            </span>
            {quarter.is_immutable && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex flex-wrap gap-3">
        {/* State advance */}
        {flow.next && (
          confirmAction === 'advance' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold">Confirm advance to <strong>{flow.next}</strong>?</span>
              <button onClick={handleAdvance} disabled={updateQ.isPending} className="text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1 disabled:opacity-50">
                {updateQ.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Yes, advance
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAction('advance')}
              className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl transition-all ${flow.color}`}
            >
              <ArrowRight className="w-3.5 h-3.5" /> {flow.label}
            </button>
          )
        )}

        {/* Immutability toggle */}
        {confirmAction === (quarter.is_immutable ? 'unlock' : 'lock') ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-semibold">
              {quarter.is_immutable ? 'Unlock this quarter?' : 'Lock this quarter as immutable?'}
            </span>
            <button onClick={handleToggleLock} disabled={updateQ.isPending} className="text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl flex items-center gap-1 disabled:opacity-50">
              {updateQ.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : quarter.is_immutable ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Confirm
            </button>
            <button onClick={() => setConfirmAction(null)} className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmAction(quarter.is_immutable ? 'unlock' : 'lock')}
            className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border transition-all ${
              quarter.is_immutable
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {quarter.is_immutable ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {quarter.is_immutable ? 'Unlock Quarter' : 'Lock Quarter'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CycleManagementPage() {
  const { data: quarters, isLoading, error, refetch } = useQuartersAdmin();

  const stateGroups = React.useMemo(() => {
    const g: Record<string, Quarter[]> = { active: [], planning: [], review: [], closed: [] };
    (quarters ?? []).forEach(q => { (g[q.state] ?? g.closed).push(q); });
    return g;
  }, [quarters]);

  const activeQ = stateGroups.active[0];

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/40 to-transparent rounded-r-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Cycle Management
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">OKR Cycle Management</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Advance quarterly states, lock immutable periods, and govern the full planning cycle lifecycle for your organisation.
            </p>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </section>

      {/* Active Quarter Hero */}
      {activeQ && (
        <section className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Live Quarter</span>
              </div>
              <h3 className="text-2xl font-black">{activeQ.label}</h3>
              <p className="text-emerald-300 text-sm font-semibold mt-1">
                {new Date(activeQ.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                {' — '}
                {new Date(activeQ.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeQ.is_immutable && (
                <span className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl">
                  <Lock className="w-3.5 h-3.5" /> Goals Locked
                </span>
              )}
              <div className="bg-emerald-700/50 rounded-2xl px-4 py-2 text-center">
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">State</p>
                <p className="text-sm font-black text-white capitalize">{activeQ.state}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Immutability warning */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 font-semibold leading-normal">
          <strong>Governance Note:</strong> Locking a quarter as immutable prevents employees from further editing approved goals. Unlocking a closed quarter requires an admin audit justification. All state changes are permanently recorded in the Audit Log.
        </p>
      </div>

      {/* Quarter Cards grouped by state */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold">Loading quarters...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-600 font-bold">Failed to load quarters</div>
      ) : (
        <div className="space-y-6">
          {(['active', 'planning', 'review', 'closed'] as const).map(state => {
            const qs = stateGroups[state] ?? [];
            if (qs.length === 0) return null;
            return (
              <div key={state}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${stateConfig[state]?.dot ?? 'bg-slate-400'}`} />
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{stateConfig[state]?.label ?? state} ({qs.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qs.map(q => <QuarterCard key={q.id} quarter={q} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
