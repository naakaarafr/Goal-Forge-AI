'use client';

import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();

  // If loading or not authenticated, let AuthGuard handle it
  if (isLoading || !isAuthenticated) {
    return null; 
  }

  // Check if user has an allowed role, or if they are a superuser
  const hasAccess = user?.role && allowedRoles.includes(user.role) || user?.is_superuser;

  if (!hasAccess) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="bg-error-container text-on-error-container p-8 rounded-3xl max-w-lg text-center flex flex-col items-center border border-error/20 shadow-xl">
          <ShieldAlert className="w-16 h-16 mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm opacity-80 mb-6">
            You do not have the required enterprise permissions to view this section.
          </p>
          <Link 
            href="/"
            className="bg-error text-on-error px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-error/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
