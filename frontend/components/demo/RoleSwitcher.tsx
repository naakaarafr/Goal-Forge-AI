'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Users, ShieldAlert, Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';

import { env } from '@/lib/env';

interface DemoUser {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  title: string;
}

const DEMO_USERS: DemoUser[] = [
  { name: 'Admin', email: 'dev@goalforge.ai', role: 'admin', title: 'Director / System Admin' },
  { name: 'Manager', email: 'manager@goalforge.ai', role: 'manager', title: 'Engineering Lead' },
  { name: 'Employee', email: 'employee@goalforge.ai', role: 'employee', title: 'Software Engineer' }
];

export function RoleSwitcher() {
  const router = useRouter();
  const { impersonate, user } = useAuthContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const addNotification = useAppStore(state => state.addNotification);

  // Impersonate active user switcher is visible in dev/demo mode or for admin users
  const isVisible = 
    env.NEXT_PUBLIC_APP_ENV === 'development' ||
    !!user?.is_superuser || 
    user?.role?.toLowerCase() === 'admin' || 
    user?.email === 'dev@goalforge.ai' ||
    user?.email === 'manager@goalforge.ai' ||
    user?.email === 'employee@goalforge.ai';

  if (!isVisible) {
    return null;
  }

  const handleImpersonate = async (targetUser: DemoUser) => {
    setIsLoading(true);
    setIsOpen(false);
    try {
      addNotification({
        type: 'info',
        title: 'Impersonation',
        message: `Switching to ${targetUser.name}...`
      });

      const updatedUser = await impersonate(targetUser.email);
      
      addNotification({
        type: 'success',
        title: 'Switched Persona',
        message: `Successfully logged in as ${updatedUser.full_name || targetUser.name}`
      });

      // Route cleanly based on the new authenticated role
      const targetRole = targetUser.role;
      router.push(`/${targetRole}/dashboard`);
    } catch (err: any) {
      console.error('[GoalForge Impersonator]', err);
      addNotification({
        type: 'error',
        title: 'Switch Failed',
        message: err.message || 'Failed to switch user session.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (r: string) => {
    switch (r) {
      case 'admin': return <ShieldAlert className="w-4 h-4 text-purple-500" />;
      case 'manager': return <Sparkles className="w-4 h-4 text-amber-500" />;
      default: return <Users className="w-4 h-4 text-blue-500" />;
    }
  };

  const currentUserRole = user?.role?.toLowerCase() || 'employee';

  return (
    <div className="relative">
      <button 
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all text-sm font-semibold text-slate-700 active:scale-95"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
        ) : (
          getRoleIcon(currentUserRole)
        )}
        <span className="capitalize text-xs font-medium">
          {isLoading ? 'Switching...' : `Viewing: ${user?.full_name || 'User'}`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mock Enterprise Impersonation</span>
          </div>
          <div className="flex flex-col py-1">
            {DEMO_USERS.map((demo) => {
              const isActive = user?.email === demo.email;
              return (
                <button 
                  key={demo.email}
                  onClick={() => handleImpersonate(demo)}
                  disabled={isActive}
                  className={`flex flex-col items-start px-4 py-2.5 hover:bg-slate-50 transition-colors border-l-4 w-full text-left disabled:opacity-70 ${
                    isActive 
                      ? 'border-blue-500 bg-blue-50/10 font-medium' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {getRoleIcon(demo.role)}
                    <span className={`text-sm ${isActive ? 'font-bold text-blue-900' : 'text-slate-800'}`}>
                      {demo.name}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 ml-6">{demo.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
