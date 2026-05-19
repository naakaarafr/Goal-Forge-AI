import { AxiosError } from 'axios';
import { ApiErrorPayload } from './types';

export class AppError extends Error {
  public status: number;
  public code?: string;
  public details?: Record<string, string[]>;

  constructor(message: string, status: number = 500, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status || 500;
    const data = error.response?.data as ApiErrorPayload | undefined;

    let message = error.message;
    let details: Record<string, string[]> | undefined;

    // Handle FastAPI validation errors (422)
    if (status === 422 && Array.isArray(data?.detail)) {
      message = 'Validation Error';
      details = {};
      data.detail.forEach((err) => {
        const field = err.loc[err.loc.length - 1]; // Usually the last item is the field name
        if (!details![field]) details![field] = [];
        details![field].push(err.msg);
      });
    } else if (data?.detail && typeof data.detail === 'string') {
      message = data.detail;
    } else if (data?.message) {
      message = data.message;
    }

    return new AppError(message, status, data?.code, details);
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500);
  }

  return new AppError('An unknown error occurred', 500);
}
