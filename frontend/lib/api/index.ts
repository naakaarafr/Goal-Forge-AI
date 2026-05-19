import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './client';
import { normalizeApiError } from './errors';

export * from './types';
export * from './errors';
export * from './auth';

/**
 * Standardizes API responses and errors.
 */
async function executeRequest<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Reusable HTTP methods with cancellation support and normalized errors.
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => {
    return executeRequest<T>(apiClient.get<T>(url, config));
  },
  
  post: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => {
    return executeRequest<T>(apiClient.post<T>(url, data, config));
  },
  
  put: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => {
    return executeRequest<T>(apiClient.put<T>(url, data, config));
  },

  patch: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => {
    return executeRequest<T>(apiClient.patch<T>(url, data, config));
  },
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => {
    return executeRequest<T>(apiClient.delete<T>(url, config));
  },
};

/**
 * Utility to create abort controllers for cancelable requests
 */
export const createAbortController = () => new AbortController();
