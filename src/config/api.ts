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
