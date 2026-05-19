'use client';

import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { PortalLayoutShell } from '@/components/layout/PortalLayoutShell';
import { 
  LayoutDashboard, Terminal, Settings, Building2, 
  Calendar, AlertOctagon, Unlock, BarChart3, Users
} from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Permission } from '@/lib/rbac/permissions';

const adminNavItems: NavItem[] = [
  { name: 'Governance Hub',    href: '/admin/dashboard',   icon: LayoutDashboard },
  { name: 'Org Management',    href: '/admin/org',          icon: Building2,       permission: Permission.MANAGE_SETTINGS },
  { name: 'Cycle Management',  href: '/admin/cycles',       icon: Calendar,        permission: Permission.MANAGE_SETTINGS },
  { name: 'Enterprise Analytics', href: '/admin/analytics', icon: BarChart3,      permission: Permission.VIEW_REPORTS },
  { name: 'Escalation Center', href: '/admin/escalations',  icon: AlertOctagon,    permission: Permission.MANAGE_SETTINGS },
  { name: 'Unlock Workflows',  href: '/admin/unlock',       icon: Unlock,          permission: Permission.MANAGE_SETTINGS },
  { name: 'Audit Center',      href: '/admin/audit',        icon: Terminal,        permission: Permission.VIEW_AUDIT_LOGS },
  { name: 'Settings',          href: '/admin/settings',     icon: Settings,        permission: Permission.MANAGE_SETTINGS },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <PortalLayoutShell sidebar={<Sidebar navItems={adminNavItems} />}>
        {children}
      </PortalLayoutShell>
    </RoleGuard>
  );
}
