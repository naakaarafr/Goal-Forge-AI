import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { authStorage } from './auth';
import { env } from '../env';

// Queue for holding requests while token is refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (apiClient: AxiosInstance) => {
  // Request Interceptor
  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = authStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Check if it's an auth error and we haven't already retried this request
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        // If the original request was the refresh endpoint itself, we're fully logged out
        if (originalRequest.url?.includes('/auth/refresh')) {
          authStorage.clearTokens();
          if (typeof window !== 'undefined' && 
              !window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/signup')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // If we are already refreshing, queue this request
          try {
            const token = await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        // Start refresh flow
        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = authStorage.getRefreshToken();
        
        if (!refreshToken) {
          // No refresh token available, logout
          authStorage.clearTokens();
          processQueue(new Error('No refresh token available'), null);
          isRefreshing = false;
          
          // Only redirect if we're not already on a public page to avoid reload loops
          if (typeof window !== 'undefined' && 
              !window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/signup')) {
             window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        try {
          // Import axios directly here to avoid interceptor loops on the custom client
          const axios = require('axios').default;
          const { data } = await axios.post(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          // Assuming standard FastAPI response { access_token, refresh_token, token_type }
          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token || refreshToken; // keep old if not rotated

          authStorage.setTokens(newAccessToken, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          authStorage.clearTokens();
          processQueue(refreshError as Error, null);
          
          // Only redirect if we're not already on a public page
          if (typeof window !== 'undefined' && 
              !window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/signup')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // If the token is fundamentally invalid (403) or the user is deleted (404), clear tokens and redirect.
      if ((error.response?.status === 403 || error.response?.status === 404) && 
          originalRequest && !originalRequest.url?.includes('/auth/')) {
        authStorage.clearTokens();
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If it's not a 401/403 or we already retried, pass the error down
      return Promise.reject(error);
    }
  );
};
