declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[][];
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";
let initialized = false;

export const initializeAnalytics = () => {
  if (!measurementId || typeof window === "undefined" || initialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  initialized = true;
};

const canTrack = (): boolean =>
  Boolean(measurementId && typeof window !== "undefined" && typeof window.gtag === "function");

export const trackPageView = (path: string, title?: string) => {
  if (!canTrack()) return;
  window.gtag?.("config", measurementId, {
    page_path: path,
    page_title: title || document.title,
  });
};

export const trackEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  if (!canTrack()) return;
  window.gtag?.("event", eventName, params);
};
