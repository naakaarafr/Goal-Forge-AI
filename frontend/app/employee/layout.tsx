'use client';

import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { PortalLayoutShell } from '@/components/layout/PortalLayoutShell';
import { LayoutDashboard, Target, CheckSquare, BarChart3, Sparkles, Bell } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Permission } from '@/lib/rbac/permissions';

const employeeNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { name: 'Goals', href: '/employee/goals', icon: Target, permission: Permission.VIEW_OWN_GOALS },
  { name: 'Quarterly Check-in', href: '/employee/achievements', icon: CheckSquare, permission: Permission.EDIT_OWN_GOALS },
  { name: 'Analytics', href: '/employee/analytics', icon: BarChart3, permission: Permission.VIEW_OWN_GOALS },
  { name: 'AI Copilot', href: '/employee/ai', icon: Sparkles },
  { name: 'Notifications', href: '/employee/notifications', icon: Bell },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['employee', 'manager', 'admin']}>
      <PortalLayoutShell sidebar={<Sidebar navItems={employeeNavItems} />}>
        {children}
      </PortalLayoutShell>
    </RoleGuard>
  );
}
