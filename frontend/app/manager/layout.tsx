'use client';

import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { PortalLayoutShell } from '@/components/layout/PortalLayoutShell';
import { 
  LayoutDashboard, Users, ClipboardCheck, Activity, 
  FileSpreadsheet, Grid, MessageSquare, BarChart3, AlertOctagon
} from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Permission } from '@/lib/rbac/permissions';

const managerNavItems: NavItem[] = [
  { name: 'Command Center', href: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'My Team', href: '/manager/team', icon: Users, permission: Permission.VIEW_TEAM },
  { name: 'Approvals', href: '/manager/approvals', icon: ClipboardCheck, showBadge: true, permission: Permission.APPROVE_GOALS },
  { name: 'Check-ins & Comments', href: '/manager/checkins', icon: MessageSquare, permission: Permission.VIEW_TEAM_PERFORMANCE },
  { name: 'Team Analytics', href: '/manager/analytics', icon: BarChart3, permission: Permission.VIEW_TEAM_PERFORMANCE },
  { name: 'Performance', href: '/manager/performance', icon: Activity, permission: Permission.VIEW_TEAM_PERFORMANCE },
  { name: 'Completion Heatmap', href: '/manager/completion', icon: Grid, permission: Permission.VIEW_TEAM_PERFORMANCE },
  { name: 'Reports', href: '/manager/reports', icon: FileSpreadsheet, permission: Permission.VIEW_REPORTS },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['manager', 'admin']}>
      <PortalLayoutShell sidebar={<Sidebar navItems={managerNavItems} />}>
        {children}
      </PortalLayoutShell>
    </RoleGuard>
  );
}
