import { useState, useEffect } from 'react';
import { api, authStorage } from '@/lib/api';

export type Role = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = authStorage.getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Mock user for now or use real API
        setUser({
          id: '1',
          email: 'admin@goalforge.ai',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
        });
      } catch (error) {
        console.error('Failed to fetch user', error);
        authStorage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (token: string, userData: User) => {
    authStorage.setTokens(token);
    setUser(userData);
  };

  const logout = () => {
    authStorage.clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, isLoading, login, logout, isAuthenticated: !!user };
}
