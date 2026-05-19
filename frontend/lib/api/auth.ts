const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const isBrowser = typeof window !== 'undefined';

export const authStorage = {
  getAccessToken: (): string | null => {
    if (!isBrowser) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    if (!isBrowser) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken?: string) => {
    if (!isBrowser) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    // Sync to cookie for Next.js Middleware SSR protection
    document.cookie = `auth_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearTokens: () => {
    if (!isBrowser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Clear the middleware cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  },
};

// Simple JWT decoder to extract role/payload without a library
export function decodeJwt<T = any>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
