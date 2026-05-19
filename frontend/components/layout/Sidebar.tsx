'use client';

import { usePermissions } from '@/hooks/usePermissions';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/store';
import { usePendingApprovals } from '@/hooks/api/useWorkflow';

import { Permission } from '@/lib/rbac/permissions';

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  showBadge?: boolean;
  permission?: Permission | Permission[];
};

export function PendingBadge() {
  const { data } = usePendingApprovals();
  const count = data?.length ?? 0;
  if (count === 0) return null;
  return (
    <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
      {count > 9 ? '9+' : count}
    </span>
  );
}



export function Sidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const { logout } = useAuthContext();
  const role = user?.role?.toLowerCase();
  const { checkPermission } = usePermissions();

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    const permissions = Array.isArray(item.permission) ? item.permission : [item.permission];
    return permissions.some(p => checkPermission(p));
  });

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 border-r border-slate-800">
      <div className="flex h-16 shrink-0 items-center px-6">
        <span className="text-xl font-bold text-white tracking-tight">GoalForge<span className="text-blue-500">AI</span></span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto mt-4">
        <nav className="flex-1 space-y-1 px-4">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600/10 text-blue-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0 transition-colors
                    ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
                  `}
                  aria-hidden="true"
                />
                {item.name}
                {item.showBadge && <PendingBadge />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section with Role and Sign Out */}
        <div className="px-4 pb-4 mt-auto space-y-2">
          {user?.role && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                role === 'manager' || role === 'admin' ? 'bg-amber-400' : 'bg-green-400'
              }`} />
              <span className="text-xs font-semibold text-slate-400 capitalize">{user.role}</span>
            </div>
          )}
          
          <button
            onClick={() => logout()}
            className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
