import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { apiClient } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { persistAuth, type AuthState, type StoredProfile } from "../../lib/auth";
import {
  decodeGoogleCredential,
  getGoogleAuthEndpoint,
  getGoogleClientId,
  getGoogleConfigError,
  loadGoogleIdentityScript,
  resolveGoogleClientId,
  type GoogleCredentialResponse,
} from "../../lib/googleAuth";

interface GoogleAuthButtonProps {
  mode: "login" | "register";
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  remember?: boolean;
  canContinue?: boolean;
  blockedMessage?: string;
}

type StatusState = {
  tone: "error" | "success" | null;
  text: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const pickText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

const parseGoogleAuthApiResponse = (payload: unknown) => {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const auth = asRecord(data?.auth);
  const profile = asRecord(data?.profile) ?? asRecord(data?.user);

  return {
    token: pickText(data?.token, auth?.token, root?.token),
    role: pickText(data?.role, auth?.role, root?.role),
    userId: typeof profile?.id === "number" ? profile.id : undefined,
    profile: profile
      ? {
          name: pickText(profile.name, profile.fullname),
          email: pickText(profile.email),
          avatar: pickText(profile.avatar, profile.picture),
        }
      : undefined,
  };
};

export default function GoogleAuthButton({
  mode,
  setAuth,
  remember = true,
  canContinue = true,
  blockedMessage,
}: GoogleAuthButtonProps) {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<StatusState>({ tone: null, text: "" });
  const [googleClientId, setGoogleClientId] = useState(() => getGoogleClientId());
  const [configResolved, setConfigResolved] = useState(Boolean(getGoogleClientId()));
  const [loading, setLoading] = useState(true);

  const googleAuthEndpoint = getGoogleAuthEndpoint();
  const buttonText = mode === "register" ? "signup_with" : "continue_with";

  useEffect(() => {
    let cancelled = false;

    if (googleClientId) {
      setConfigResolved(true);
      return;
    }

    setLoading(true);
    void resolveGoogleClientId()
      .then((resolvedClientId) => {
        if (cancelled) return;

        setGoogleClientId(resolvedClientId);
        setConfigResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setConfigResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  const handleCredentialResponse = useEffectEvent(async (response: GoogleCredentialResponse) => {
    if (!canContinue) {
      setStatus({
        tone: "error",
        text:
          blockedMessage ||
          "Please complete the required step before continuing with Google.",
      });
      trackEvent(`${mode}_google_blocked`);
      return;
    }

    try {
      const googleProfilePayload = decodeGoogleCredential(response.credential);
      const email = pickText(googleProfilePayload.email)?.toLowerCase() || "";

      if (!email) {
        throw new Error("Google account email was not provided.");
      }

      if (googleProfilePayload.email_verified === false) {
        throw new Error("Use a verified Google account to continue.");
      }

      const googleProfile: Partial<StoredProfile> = {
        name: pickText(googleProfilePayload.name) || email.split("@")[0],
        email,
        avatar: pickText(googleProfilePayload.picture) || "",
      };

      let authState: AuthState = {
        token: response.credential,
        role: "user",
        userId: null,
        name: googleProfile.name ?? null,
        email: googleProfile.email ?? null,
        avatar: googleProfile.avatar ?? null,
      };

      if (googleAuthEndpoint) {
        const apiResponse = await apiClient.post(googleAuthEndpoint, {
          credential: response.credential,
          intent: mode,
          clientId: googleClientId,
        });
        const parsedResponse = parseGoogleAuthApiResponse(apiResponse.data);

        if (!parsedResponse.token) {
          throw new Error("Google auth endpoint did not return a token.");
        }

        authState = {
          token: parsedResponse.token,
          role: parsedResponse.role || "user",
          userId: parsedResponse.userId ?? null,
          name: parsedResponse.profile?.name ?? googleProfile.name ?? null,
          email: parsedResponse.profile?.email ?? googleProfile.email ?? null,
          avatar: parsedResponse.profile?.avatar ?? googleProfile.avatar ?? null,
        };

        persistAuth(authState, {
          remember,
          profile: {
            ...googleProfile,
            ...parsedResponse.profile,
          },
        });
      } else {
        persistAuth(authState, {
          remember,
          profile: googleProfile,
        });
      }

      setAuth(authState);
      setStatus({
        tone: "success",
        text:
          mode === "register"
            ? "Google account connected. Redirecting..."
            : "Signed in with Google. Redirecting...",
      });
      trackEvent(`${mode}_google_success`, {
        backendExchange: Boolean(googleAuthEndpoint),
      });
      navigate("/todo/tasks");
    } catch (error: unknown) {
      const fallbackMessage = googleAuthEndpoint
        ? "Google sign-in failed. Check your Google auth endpoint configuration."
        : "Google sign-in failed. Please try again.";

      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || fallbackMessage
        : error instanceof Error && error.message
          ? error.message
          : fallbackMessage;

      setStatus({
        tone: "error",
        text: message,
      });
      trackEvent(`${mode}_google_failed`, {
        backendExchange: Boolean(googleAuthEndpoint),
      });
    }
  });

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    if (!buttonRef.current) return;

    if (!googleClientId) {
      buttonRef.current.innerHTML = "";
      setLoading(false);
      return;
    }

    const renderGoogleButton = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
        return;
      }

      const width = Math.max(260, Math.floor(buttonRef.current.getBoundingClientRect().width || 320));
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: buttonText,
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
    };

    setLoading(true);

    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void handleCredentialResponse(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup",
        });

        renderGoogleButton();

        if (typeof ResizeObserver !== "undefined" && buttonRef.current) {
          resizeObserver = new ResizeObserver(() => {
            renderGoogleButton();
          });
          resizeObserver.observe(buttonRef.current);
        }

        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setStatus({
          tone: "error",
          text:
            error instanceof Error && error.message
              ? error.message
              : "Google sign-in failed to load.",
        });
        setLoading(false);
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();

      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      if (buttonRef.current) {
        buttonRef.current.innerHTML = "";
      }
    };
  }, [buttonText, googleClientId]);

  return (
    <div className="saas-social-auth">
      {googleClientId ? (
        <div
          ref={buttonRef}
          className={`saas-google-button-slot${loading ? " is-loading" : ""}`}
          aria-live="polite"
        />
      ) : configResolved ? (
        <>
          <button type="button" className="saas-social-btn" disabled>
            <i className="bi bi-google" aria-hidden="true" />
            Continue with Google
          </button>
          <p className="todoist-muted saas-social-note">{getGoogleConfigError()}</p>
        </>
      ) : (
        <div
          ref={buttonRef}
          className="saas-google-button-slot is-loading"
          aria-live="polite"
        />
      )}

      {!canContinue && blockedMessage && (
        <p className="todoist-muted saas-social-note">{blockedMessage}</p>
      )}

      {status.text && (
        <p
          className={status.tone === "error" ? "todoist-error" : "todoist-success"}
          role="status"
          aria-live="polite"
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
