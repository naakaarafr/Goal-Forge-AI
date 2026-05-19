import { z } from 'zod';

const isBrowser = typeof window !== 'undefined';

// Get baseline variables
let appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
let appUrl = process.env.NEXT_PUBLIC_APP_URL;
let apiUrl = process.env.NEXT_PUBLIC_API_URL;
let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
let enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH || 'false';

// Browser-side runtime fallback calculations
if (isBrowser) {
  if (!appUrl) {
    appUrl = window.location.origin;
  }
  if (!apiUrl) {
    const host = window.location.hostname;
    if (host.includes('onrender.com')) {
      const backendHost = host.replace('goalforge-frontend', 'goalforge-backend');
      apiUrl = `https://${backendHost}/api/v1`;
      wsUrl = `wss://${backendHost}/ws`;
    } else {
      apiUrl = `http://${host}:8000/api/v1`;
      wsUrl = `ws://${host}:8000/ws`;
    }
  }
}

// Build-time fallbacks
if (!appUrl) appUrl = 'http://localhost:3000';
if (!apiUrl) apiUrl = 'http://localhost:8000/api/v1';

// Ensure API URL ends correctly
if (apiUrl && !apiUrl.includes('/api/v1')) {
  apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1';
}

// Auto-derive WebSocket URL if missing
if (!wsUrl) {
  if (apiUrl.startsWith('https://')) {
    wsUrl = apiUrl.replace('https://', 'wss://').replace('/api/v1', '/ws');
  } else {
    wsUrl = apiUrl.replace('http://', 'ws://').replace('/api/v1', '/ws');
  }
}

// Ensure WS URL starts with ws:// or wss://
if (wsUrl.startsWith('http://')) {
  wsUrl = wsUrl.replace('http://', 'ws://');
} else if (wsUrl.startsWith('https://')) {
  wsUrl = wsUrl.replace('https://', 'wss://');
}
if (!wsUrl.endsWith('/ws')) {
  wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
}

const envSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url().refine((url) => url.startsWith('ws://') || url.startsWith('wss://'), {
    message: "WebSocket URL must start with ws:// or wss://",
  }),
  NEXT_PUBLIC_ENABLE_MOCK_AUTH: z.boolean(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: appEnv,
  NEXT_PUBLIC_APP_URL: appUrl,
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_WS_URL: wsUrl,
  NEXT_PUBLIC_ENABLE_MOCK_AUTH: enableMockAuth === 'true',
});

export type EnvVars = z.infer<typeof envSchema>;
