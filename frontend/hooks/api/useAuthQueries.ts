import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { env } from '@/lib/env';

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@goalforge.ai',
  full_name: 'Dev User',
  role: 'admin',
  is_active: true,
  is_superuser: true,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      if (env.NEXT_PUBLIC_ENABLE_MOCK_AUTH) {
        try {
          return await api.get<any>('auth/me/');
        } catch {
          return MOCK_USER;
        }
      }
      
      // Real Auth Mode
      try {
        return await api.get<any>('auth/me/');
      } catch (err: any) {
        // Clear tokens on 401 (Unauthorized), 403 (Forbidden), or 404 (User Deleted)
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          import('@/lib/api/auth').then(({ authStorage }) => authStorage.clearTokens());
        }
        return null;
      }
    },
    staleTime: 30 * 60 * 1000,
    retry: false, // Don't retry auth failures in real mode
  });
}

