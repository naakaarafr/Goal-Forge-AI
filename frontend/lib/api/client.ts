import axios from 'axios';
import axiosRetry from 'axios-retry';
import { env } from '../env';
import { setupInterceptors } from './interceptors';

const API_BASE_URL = env.NEXT_PUBLIC_API_URL?.endsWith('/') 
  ? env.NEXT_PUBLIC_API_URL 
  : `${env.NEXT_PUBLIC_API_URL}/`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds default timeout to accommodate slow connections
});

// Setup idempotent request retries (GET, PUT, DELETE, etc.)
// Retries on Network Errors and 5xx errors by default
axiosRetry(apiClient, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition: (error) => {
    // Retry on 5xx errors or network failures. Don't retry on 4xx.
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status! >= 500;
  }
});

// Apply our custom interceptors
setupInterceptors(apiClient);

export default apiClient;
