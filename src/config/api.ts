interface ApiConfig {
  openRouterApiKey: string;
  siteUrl: string;
  siteName: string;
}

const isBrowser = typeof window !== 'undefined';

export const apiConfig: ApiConfig = {
  openRouterApiKey: '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',
  siteUrl: isBrowser ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'AI Chat Dashboard'
};
  