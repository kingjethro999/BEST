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
