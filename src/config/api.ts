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
