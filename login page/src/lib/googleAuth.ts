import { API_BASE_URL, apiRoutes } from "./api";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
const googleConfigEndpoint =
  import.meta.env.VITE_GOOGLE_CONFIG_ENDPOINT?.trim() || apiRoutes.googleConfig;
const googleAuthEndpoint = import.meta.env.VITE_GOOGLE_AUTH_ENDPOINT?.trim() || apiRoutes.googleAuth;

let googleIdentityScriptPromise: Promise<void> | null = null;
let googleClientIdPromise: Promise<string> | null = null;
let resolvedGoogleClientId = googleClientId;

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GoogleJwtPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: "popup" | "redirect";
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleAccountsIdApi {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsIdApi;
      };
    };
  }
}

export const getGoogleClientId = (): string => resolvedGoogleClientId;

export const getGoogleAuthEndpoint = (): string => googleAuthEndpoint;

export const getGoogleConfigError = (): string =>
  "Set GOOGLE_CLIENT_ID in Laravel .env or VITE_GOOGLE_CLIENT_ID in frontend .env to enable Google sign-in.";

const toConfigUrl = (endpoint: string): string =>
  /^https?:\/\//i.test(endpoint) ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

const pickGoogleClientId = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) return "";

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.client_id,
    record.clientId,
    (record.data as Record<string, unknown> | undefined)?.client_id,
    (record.data as Record<string, unknown> | undefined)?.clientId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
};

export const resolveGoogleClientId = async (): Promise<string> => {
  if (resolvedGoogleClientId) {
    return resolvedGoogleClientId;
  }

  if (!googleClientIdPromise) {
    googleClientIdPromise = fetch(toConfigUrl(googleConfigEndpoint), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          return "";
        }

        const payload = (await response.json()) as unknown;
        const nextClientId = pickGoogleClientId(payload);
        resolvedGoogleClientId = nextClientId;
        return nextClientId;
      })
      .catch(() => "")
      .finally(() => {
        googleClientIdPromise = null;
      });
  }

  return googleClientIdPromise;
};

export const loadGoogleIdentityScript = async (): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in the browser.");
  }

  if (window.google?.accounts?.id) {
    return;
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const onReady = () => {
        if (window.google?.accounts?.id) {
          resolve();
        } else {
          googleIdentityScriptPromise = null;
          reject(new Error("Google sign-in is unavailable right now."));
        }
      };

      const onError = () => {
        googleIdentityScriptPromise = null;
        reject(new Error("Google sign-in failed to load."));
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-google-identity="true"]'
      );

      if (existingScript) {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        existingScript.addEventListener("load", onReady, { once: true });
        existingScript.addEventListener("error", onError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.addEventListener("load", onReady, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
    });
  }

  await googleIdentityScriptPromise;
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const decodeGoogleCredential = (credential: string): GoogleJwtPayload => {
  const parts = credential.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid Google credential received.");
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as GoogleJwtPayload;
  } catch {
    throw new Error("Unable to read Google account details.");
  }
};
