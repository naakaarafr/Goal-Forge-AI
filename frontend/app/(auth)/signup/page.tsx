'use client';

import React, { useState } from 'react';
import { Target, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthContext();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Signup the user
      await api.post('auth/signup', { 
        email, 
        password, 
        full_name: fullName 
      });

      // 2. Automatically login after signup
      const loginData = await api.post<any>('auth/login', { 
        username: email, // Backend uses username for login
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

      login(loginData.access_token, loginData.refresh_token);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-outline-variant p-8 glass-panel">
        <div className="flex flex-col items-center mb-8">
          <Target className="text-primary w-12 h-12 mb-2" />
          <h1 className="text-2xl font-bold text-primary">Join GoalForge AI</h1>
          <p className="text-on-surface-variant text-sm">Start orchestrating performance today</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-lg text-xs mb-6 border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">Email Address</label>
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
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg shadow-md hover:bg-primary-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : 'Get Started Now'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-on-surface-variant">
          Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}
