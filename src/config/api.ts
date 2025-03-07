interface ApiConfig {
  openRouterApiKey: string;
  siteUrl: string;
  siteName: string;
}

const isBrowser = typeof window !== 'undefined';

export const apiConfig: ApiConfig = {
  openRouterApiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '',
  siteUrl: isBrowser ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'AI Chat Dashboard'
};
