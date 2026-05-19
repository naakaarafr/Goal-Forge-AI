'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import ToastContainer from '@/components/notifications/ToastContainer';
import { env } from '@/lib/env';

/**
 * Calls the backend's /auth/dev-login endpoint to get a real, DB-backed JWT
 * for the dev user. This is only done when NEXT_PUBLIC_ENABLE_MOCK_AUTH=true.
 * The endpoint auto-creates the dev user in the DB if they don't exist.
 */
async function seedMockAuthToken() {
  // Check if we already have a valid, non-expired token
  const existing = localStorage.getItem('access_token');
  if (existing) {
    try {
      const parts = existing.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        if (payload.exp && payload.exp > Math.floor(Date.now() / 1000) + 300) {
          return; // Valid token with at least 5 min left — skip
        }
      }
    } catch {
      // Corrupted token, regenerate below
    }
  }

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.warn('[GoalForge Dev] /auth/dev-login failed:', res.status, res.statusText);
      return;
    }

    const data: { access_token: string; refresh_token: string } = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    // Also set the cookie so Next.js middleware lets us through to /dashboard
    document.cookie = `auth_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 8}; SameSite=Lax`;
    console.info('[GoalForge Dev] Mock auth token seeded via /auth/dev-login.');
  } catch (err) {
    console.warn('[GoalForge Dev] Could not reach backend for dev-login:', err);
    // If the backend is down, fallback — the AI endpoints still work with get_current_user_or_none
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 0,
      }
    },
    queryCache: new QueryCache({
      onError: (error: any) => {
        import('@/store').then(({ useAppStore }) => {
          useAppStore.getState().addNotification({
            type: 'error',
            title: 'Data Fetching Error',
            message: error.message || 'An unexpected error occurred while loading data.'
          });
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: any) => {
        import('@/store').then(({ useAppStore }) => {
          useAppStore.getState().addNotification({
            type: 'error',
            title: 'Action Failed',
            message: error.message || 'An error occurred while saving your changes.'
          });
        });
      },
    }),
  }));

  // Seed a real dev JWT via /auth/dev-login when mock auth is enabled
  useEffect(() => {
    if (env.NEXT_PUBLIC_ENABLE_MOCK_AUTH) {
      seedMockAuthToken();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
}
