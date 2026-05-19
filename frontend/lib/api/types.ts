export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    total_pages?: number;
    total_items?: number;
    [key: string]: any;
  };
}

export interface ApiErrorPayload {
  detail?: string | Array<{ loc: string[]; msg: string; type: string }>;
  message?: string;
  code?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}
