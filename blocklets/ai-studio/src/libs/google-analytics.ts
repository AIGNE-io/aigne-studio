export const sendEvent = (event: string, params?: Record<string, any>) => {
  if (window.gtag) window.gtag('event', event, params);
};
