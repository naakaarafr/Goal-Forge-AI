'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Zustand actions
  const setUser = useAppStore(state => state.setUser);
  const setLoading = useAppStore(state => state.setLoading);
  const zustandLogin = useAppStore(state => state.login);
  const zustandLogout = useAppStore(state => state.logout);
  
  const { data: user, isLoading: isQueryLoading, refetch } = useCurrentUser();
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync React Query user to Zustand
  useEffect(() => {
    setUser(user || null);
    setLoading(!isMounted || isQueryLoading);
  }, [user, isQueryLoading, isMounted, setUser, setLoading]);

  // We patch the login/logout functions here to handle Next.js routing and Query invalidation
  // which shouldn't be strictly inside the Zustand store logic.
  const login = (accessToken: string, refreshToken?: string) => {
    zustandLogin(accessToken, refreshToken);
    refetch().then((res) => {
      const u = res.data;
      if (u) {
        const role = u.role?.toLowerCase();
        if (role === 'admin') {
          router.push('/admin/dashboard');
        } else if (role === 'manager') {
          router.push('/manager/dashboard');
        } else {
          router.push('/employee/dashboard');
        }
      } else {
        router.push('/employee/dashboard');
      }
    });
  };

  const logout = () => {
    zustandLogout();
    queryClient.clear(); // Clear all react-query cache on logout
    router.push('/login');
  };

  const impersonate = async (email: string) => {
    const { env } = await import('@/lib/env');
    const token = localStorage.getItem('access_token');
    
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Impersonation failed');
    }

    const data: { access_token: string; refresh_token: string } = await res.json();
    
    // Clear React Query cache before switching to avoid flashing stale user data
    queryClient.clear();
    
    // Use the same login flow to update tokens & cookies
    zustandLogin(data.access_token, data.refresh_token);
    
    // Force a fresh user data fetch
    const updated = await refetch();
    return updated.data;
  };

  // We still use Context to provide these enhanced routing-aware functions, 
  // but components can also read state directly from Zustand `useAppStore`.
  return (
    <AuthContext.Provider value={{ login, logout, impersonate }}>
      {children}
    </AuthContext.Provider>
  );
}

// Minimal context just for functions that need hooks (router, queryClient)
const AuthContext = createContext<{
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  impersonate: (email: string) => Promise<any>;
} | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  const user = useAppStore(state => state.user);
  const isLoading = useAppStore(state => state.isLoading);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return {
    ...context,
    user,
    isLoading,
    isAuthenticated,
  };
}
