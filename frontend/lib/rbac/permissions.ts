export type Role = 'employee' | 'manager' | 'admin';

export enum Permission {
  // Goals
  VIEW_OWN_GOALS = 'VIEW_OWN_GOALS',
  CREATE_GOALS = 'CREATE_GOALS',
  EDIT_OWN_GOALS = 'EDIT_OWN_GOALS',
  DELETE_OWN_GOALS = 'DELETE_OWN_GOALS',
  
  // Team
  VIEW_TEAM = 'VIEW_TEAM',
  VIEW_TEAM_GOALS = 'VIEW_TEAM_GOALS',
  APPROVE_GOALS = 'APPROVE_GOALS',
  VIEW_TEAM_PERFORMANCE = 'VIEW_TEAM_PERFORMANCE',
  
  // Reports
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  
  // Admin
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_ALL_USERS = 'MANAGE_ALL_USERS'
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  employee: [
    Permission.VIEW_OWN_GOALS,
    Permission.CREATE_GOALS,
    Permission.EDIT_OWN_GOALS,
    Permission.DELETE_OWN_GOALS,
  ],
  manager: [
    // Inherit employee permissions
    Permission.VIEW_OWN_GOALS,
    Permission.CREATE_GOALS,
    Permission.EDIT_OWN_GOALS,
    Permission.DELETE_OWN_GOALS,
    
    // Manager specific
    Permission.VIEW_TEAM,
    Permission.VIEW_TEAM_GOALS,
    Permission.APPROVE_GOALS,
    Permission.VIEW_TEAM_PERFORMANCE,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
  ],
  admin: [
    // Admins typically have all access in GoalForge AI
    ...Object.values(Permission)
  ]
};

export const hasPermission = (userRole: Role | undefined, permission: Permission): boolean => {
  if (!userRole) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};
