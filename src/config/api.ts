interface ApiConfig {
  openRouterApiKey: string;
  siteUrl: string;
  siteName: string;
}

export const apiConfig: ApiConfig = {
  openRouterApiKey: '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', // Set this value when deploying
  siteUrl: window?.location?.origin || '', // Dynamically get the site URL
  siteName: 'AI Chat Dashboard'
};
