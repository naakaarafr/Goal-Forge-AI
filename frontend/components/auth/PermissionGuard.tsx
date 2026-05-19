'use client';

import React from 'react';
import { Permission } from '@/lib/rbac/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: Permission | Permission[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { checkPermission } = usePermissions();

  const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
  
  // If the user has any of the requested permissions, render children
  const hasAccess = permissionsToCheck.some(p => checkPermission(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
