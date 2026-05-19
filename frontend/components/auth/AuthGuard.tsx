'use client';

import React, { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and not authenticated, push to login
    if (!isLoading && !isAuthenticated && !pathname.includes('/login')) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show a full-screen loader while checking auth state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-outline-variant flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-on-surface">Authenticating...</h2>
          <p className="text-sm text-on-surface-variant mt-1">Establishing secure connection</p>
        </div>
      </div>
    );
  }

  // If not authenticated, render nothing while the redirect happens
  // UNLESS we are already on the login/signup page
  if (!isAuthenticated && !pathname.includes('/login') && !pathname.includes('/signup')) {
    return null;
  }

  return <>{children}</>;
}
