'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Users, Search, ShieldCheck, Plus, X, Sparkles, CheckCircle2,
  AlertCircle, Award, User, Key, Mail, Building, UserPlus, ArrowRight
} from 'lucide-react';
import { useAppStore } from '@/store';
import { 
  useTeamMembers, 
  useAssignableEmployees,
  useAssignTeamMember,
  TeamMember
} from '@/hooks/api/useManager';
import { useQuarters } from '@/hooks/api/useQuarters';

export default function TeamManagementPage() {
  const user = useAppStore(state => state.user);
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  
  const { data: quarters } = useQuarters();
  const { data: teamMembers, isLoading: teamLoading, refetch: refetchTeam } = useTeamMembers(filters.quarter);
  const { data: assignableEmployees, isLoading: employeesLoading } = useAssignableEmployees();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  // Assign Team Member Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  
  const assignMemberMutation = useAssignTeamMember();

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedEmployeeId('');
    setFormError(null);
    setFormSuccess(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setFormError('Please select an employee to add to your team.');
      return;
    }
    
    setFormError(null);
    setFormSuccess(false);

    assignMemberMutation.mutate({
      employee_id: selectedEmployeeId
    }, {
      onSuccess: () => {
        setFormSuccess(true);
        refetchTeam();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      },
      onError: (err: any) => {
        setFormError(err?.response?.data?.detail || 'Failed to assign team member. Please try again.');
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
      return matchesSearch;
    });
  }, [teamMembers, searchQuery]);

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
          <h1 className="text-3xl font-extrabold tracking-tight">Team Directory & Management</h1>
          <p className="text-slate-300 font-medium">Provision new staff accounts, manage hierarchy mapping, and view active direct report rosters.</p>
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

      {/* Roster Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search team member or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
          />
        </div>

        {/* Add Team Member Primary Action */}
        <button
          onClick={handleOpenModal}
          className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Directory Grid */}
      {teamLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Compiling team directory roster...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No reports mapped</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">There are no staff accounts configured under your team, or none match your active filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div 
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl group-hover:from-indigo-500/10 transition-all"></div>
              
              <div>
                {/* User Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center text-base shadow-md group-hover:scale-105 transition-transform">
                      {member.full_name ? member.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{member.full_name || 'Team Member'}</h4>
                      <span className="text-slate-400 text-xs font-semibold">{member.email}</span>
                    </div>
                  </div>
                  
                  {/* Role Badge */}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200`}>
                    {filters.quarter}
                  </span>
                </div>

                {/* Info row */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-indigo-50/50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {member.department_name || 'General Operations'}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {member.total_goals} goal{member.total_goals !== 1 ? 's' : ''} configured
                  </span>
                </div>
              </div>

              {/* View Performance CTA Deep Link */}
              <Link 
                href={`/manager/performance?employeeId=${member.id}`}
                className="w-full py-2.5 bg-slate-50 hover:bg-indigo-600 border border-slate-200 hover:border-indigo-600 text-slate-700 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 group/btn cursor-pointer shadow-xs"
              >
                View Performance Engine
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-md relative animate-in zoom-in-95 duration-300">
            {/* Header Banner */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-2 relative z-10">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white leading-tight">Add Team Member</h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer relative z-10"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Select Employee:
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium appearance-none"
                    disabled={employeesLoading}
                  >
                    <option value="" disabled>Select an employee from the company...</option>
                    {assignableEmployees?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name || 'Unnamed'} ({emp.email})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                {assignableEmployees?.length === 0 && !employeesLoading && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">No available employees to add at this time.</p>
                )}
              </div>

              {/* Status alerts */}
              {formError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Employee successfully assigned to your team!</span>
                </div>
              )}

              {/* Action buttons */}
              <button 
                type="submit"
                disabled={assignMemberMutation.isPending || employeesLoading || !selectedEmployeeId}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                {assignMemberMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Assigning employee...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Assign to Team
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
