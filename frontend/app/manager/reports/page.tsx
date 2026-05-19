'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { useQuarters } from '@/hooks/api/useQuarters';
import { useGoals } from '@/hooks/api/useGoals';
import { useExportAchievements } from '@/hooks/api/useReports';
import { FileSpreadsheet, Download, Filter, Target, Activity, CheckCircle2 } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';

export default function ReportsDashboard() {
  const user = useAppStore(s => s.user);
  const { data: quarters } = useQuarters();
  const exportMutation = useExportAchievements();

  // Local state for filters
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  
  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !selectedQuarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setSelectedQuarter(activeQ.label);
      }
    }
  }, [quarters, selectedQuarter]);

  // Use existing goals endpoint to "preview" data based on the current quarter filter
  // The 'team' scope natively leverages manager/admin visibility rules
  const { data: previewData, isLoading: previewLoading } = useGoals({
    quarter: selectedQuarter || undefined,
    scope: 'team',
    limit: 5
  });

  const goals = Array.isArray(previewData) ? previewData : previewData?.items || [];

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">No Reporting Access</h2>
          <p className="text-sm text-slate-500 mt-2">Achievement reports are restricted to managers and administrators.</p>
        </div>
      </div>
    );
  }

  const handleExport = (format: 'csv' | 'excel') => {
    exportMutation.mutate({
      quarter: selectedQuarter || undefined,
      format
    });
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Reporting Engine</h2>
          <p className="text-slate-500 font-medium mt-1">Configure filters and generate bulk achievement exports.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Filter Configurator */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800">Export Configuration</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Quarter</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                >
                  <option value="">All Quarters (Historical)</option>
                  {quarters?.map(q => (
                    <option key={q.id} value={q.label}>{q.label} ({q.state})</option>
                  ))}
                </select>
              </div>

              {/* Department/Manager filters could go here in v2 */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-4 font-medium">
                  {user.role === 'admin' 
                    ? "Admin Access: Export will include the entire organization's data."
                    : "Manager Access: Export is securely restricted to your direct team members."}
                </p>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            <h3 className="text-white font-bold text-lg mb-2 relative z-10">Generate Report</h3>
            <p className="text-slate-400 text-xs mb-6 relative z-10">
              Download the fully populated data payload for the selected filters.
            </p>

            <div className="space-y-3 relative z-10">
              <button 
                onClick={() => handleExport('excel')}
                disabled={exportMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {exportMutation.isPending && exportMutation.variables?.format === 'excel' ? (
                  <Activity className="w-5 h-5 animate-pulse" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
                {exportMutation.isPending && exportMutation.variables?.format === 'excel' ? 'Generating...' : 'Export to Excel (.xlsx)'}
              </button>

              <button 
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isPending}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 disabled:opacity-50"
              >
                {exportMutation.isPending && exportMutation.variables?.format === 'csv' ? (
                  <Activity className="w-5 h-5 animate-pulse" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {exportMutation.isPending && exportMutation.variables?.format === 'csv' ? 'Generating...' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Live Preview */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Data Preview</h3>
                <p className="text-xs text-slate-500 mt-1">Top 5 matching records for your filter configuration.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                <Target className="w-4 h-4" /> Scope: {user.role === 'admin' ? 'Organization' : 'My Team'}
              </div>
            </div>

            <div className="p-6 flex-1 bg-slate-50/50">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <Activity className="w-8 h-8 animate-spin" />
                  <p className="font-semibold text-sm">Querying database...</p>
                </div>
              ) : goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <CheckCircle2 className="w-12 h-12 opacity-20" />
                  <p className="font-semibold">No data found for this filter combination.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((g: any) => (
                    <div key={g.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-widest">{g.quarter}</span>
                          <h4 className="font-bold text-slate-800 truncate">{g.title}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                          <span>Status: <span className="uppercase text-slate-700 font-bold">{g.status}</span></span>
                          <span>Target: {g.target_value}</span>
                        </div>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Progress</span>
                          <span className="text-xs font-black text-slate-800">{g.progress}%</span>
                        </div>
                        <ProgressBar progress={g.progress} uom={g.uom} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {goals.length > 0 && (
              <div className="p-4 bg-slate-50 text-center border-t border-slate-100 text-xs font-bold text-slate-500">
                Preview limited to 5 records. The full export will contain all matching entries.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
