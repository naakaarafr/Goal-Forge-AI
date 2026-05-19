'use client';

import React from 'react';
import { useUsersAdmin, useReassignManager, AdminUser } from '@/hooks/api/useAdmin';
import { useAppStore } from '@/store';
import {
  Building2, Users, Search, User, Mail, Shield,
  ChevronDown, Check, X, Loader2, AlertCircle,
  UserCog, ArrowRight, RefreshCw, Network
} from 'lucide-react';

const roleColors: Record<string, string> = {
  admin:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  manager:  'bg-blue-100 text-blue-700 border-blue-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
};

function ReassignManagerSelect({
  user,
  managers,
  onSaved,
}: {
  user: AdminUser;
  managers: AdminUser[];
  onSaved: () => void;
}) {
  const addNotification = useAppStore(s => s.addNotification);
  const reassign = useReassignManager();
  const [selected, setSelected] = React.useState(user.manager_id ?? '');
  const [dirty, setDirty] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(e.target.value);
    setDirty(e.target.value !== (user.manager_id ?? ''));
  };

  const handleSave = async () => {
    try {
      await reassign.mutateAsync({ userId: user.id, managerId: selected || null });
      addNotification({ type: 'success', title: 'Manager Updated', message: `Reporting line updated for ${user.full_name || user.email}.` });
      setDirty(false);
      onSaved();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Update Failed', message: err.message || 'Could not reassign manager.' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={selected}
          onChange={handleChange}
          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all pr-7"
        >
          <option value="">— No Manager —</option>
          {managers.filter(m => m.id !== user.id).map(m => (
            <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
      {dirty && (
        <button
          onClick={handleSave}
          disabled={reassign.isPending}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-2.5 py-2 rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
        >
          {reassign.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
      )}
    </div>
  );
}

export default function OrgManagementPage() {
  const addNotification = useAppStore(s => s.addNotification);
  const { data: allUsers, isLoading, error, refetch } = useUsersAdmin();

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');

  const users = allUsers ?? [];
  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  const roleBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [users]);

  const filtered = React.useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        (u.full_name?.toLowerCase().includes(search.toLowerCase())) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-blue-50/40 to-transparent rounded-r-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Org Management
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Organisation Hierarchy</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Manage all users, assign reporting lines, and restructure the organizational hierarchy. Changes take effect immediately.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </section>

      {/* Role KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Total Users', value: users.length, color: 'text-slate-900', bg: 'bg-slate-50', icon: Users },
          { label: 'Admins',    value: roleBreakdown['admin']    ?? 0, color: 'text-indigo-700', bg: 'bg-indigo-50', icon: Shield },
          { label: 'Managers', value: roleBreakdown['manager']  ?? 0, color: 'text-blue-700',   bg: 'bg-blue-50',   icon: UserCog },
          { label: 'Employees',value: roleBreakdown['employee'] ?? 0, color: 'text-slate-700',  bg: 'bg-slate-100', icon: User },
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

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-8"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <span className="text-xs text-slate-400 font-bold whitespace-nowrap">{filtered.length} users</span>
      </div>

      {/* User Table */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-800">User Directory & Hierarchy Editor</h3>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-semibold">Loading organisation data...</span>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-rose-600">
            <AlertCircle className="w-8 h-8" />
            <p className="font-bold text-sm">Failed to load users</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 min-w-[200px]">Reports To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(u => {
                  const currentManager = managers.find(m => m.id === u.manager_id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                            {u.full_name?.charAt(0).toUpperCase() ?? <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{u.full_name || 'Unnamed'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${roleColors[u.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-semibold">
                        {u.department_id ? `Dept ${u.department_id.slice(0, 6)}...` : '—'}
                      </td>
                      <td className="p-4">
                        <ReassignManagerSelect
                          user={u}
                          managers={managers}
                          onSaved={() => refetch()}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
