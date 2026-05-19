import { env } from './env';

export const API_URL = env.NEXT_PUBLIC_API_URL;
export const WS_URL = env.NEXT_PUBLIC_WS_URL;
export const APP_URL = env.NEXT_PUBLIC_APP_URL;

export const APP_ENV = env.NEXT_PUBLIC_APP_ENV;
export const IS_DEVELOPMENT = APP_ENV === 'development';
export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_STAGING = APP_ENV === 'staging';

export const USE_MOCK_AUTH = env.NEXT_PUBLIC_ENABLE_MOCK_AUTH;
