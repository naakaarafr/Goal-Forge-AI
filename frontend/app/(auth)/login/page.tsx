'use client';

import React, { useState } from 'react';
import { Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, authStorage } from '@/lib/api';

import { useAuthContext } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { login, logout, isAuthenticated } = useAuthContext();
  
  // Clear any stale state on mount to prevent loops
  React.useEffect(() => {
    if (!isAuthenticated) {
      authStorage.clearTokens();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.post<any>('auth/login', { 
        username: email, 
        password: password 
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: [(reqData) => {
          const params = new URLSearchParams();
          params.append('username', reqData.username);
          params.append('password', reqData.password);
          return params.toString();
        }]
      });
      
      // Use the global context login to handle state updates & redirects
      login(data.access_token, data.refresh_token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-outline-variant p-8 glass-panel">
        <div className="flex flex-col items-center mb-8">
          <Target className="text-primary w-12 h-12 mb-2" />
          <h1 className="text-2xl font-bold text-primary">GoalForge AI</h1>
          <p className="text-on-surface-variant text-sm">Log in to your enterprise account</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-lg text-xs mb-6 border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
              <span className="text-xs text-on-surface-variant">Remember me</span>
            </label>
            <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-medium py-2 rounded-lg shadow-md hover:bg-primary-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-on-surface-variant">
          Don't have an account? <Link href="/signup" className="text-primary font-semibold hover:underline">Request Access</Link>
        </p>
      </div>
    </div>
  );
}
