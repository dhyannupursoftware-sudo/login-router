import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import GoogleAuthButton from "../components/auth/GoogleAuthButton";
import { useSeo } from "../hooks/useSeo";
import { trackEvent } from "../lib/analytics";
import { persistAuth, type AuthState } from "../lib/auth";
import { apiClient, apiRoutes } from "../lib/api";

interface LoginProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

interface LoginErrors {
  email?: string;
  password?: string;
  server?: string;
}

const loginImage = "/login-side-visual.svg";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ setAuth }: LoginProps) {
  useSeo({
    title: "Login",
    description:
      "Log in to Yono Todolist and access your protected task workspace, dashboard, and account settings.",
    path: "/login",
  });

  const [user, setUser] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  const validate = (): boolean => {
    const nextErrors: LoginErrors = {};
    const email = user.email.trim().toLowerCase();

    if (!emailRegex.test(email)) nextErrors.email = "Please enter a valid email address.";
    if (user.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setField = (key: "email" | "password", value: string) => {
    setUser((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, server: undefined }));
  };

  const loginUser = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await apiClient.post(apiRoutes.login, {
        email: user.email.trim().toLowerCase(),
        password: user.password,
      });

      const apiUser = typeof res.data?.user === "object" && res.data.user !== null ? res.data.user : null;
      const authData: AuthState = {
        token: res.data.token as string,
        role: (res.data.role as string | undefined) ?? "user",
        userId: typeof apiUser?.id === "number" ? apiUser.id : null,
        name: typeof apiUser?.name === "string" ? apiUser.name : null,
        email: typeof apiUser?.email === "string" ? apiUser.email : null,
        avatar: typeof apiUser?.avatar === "string" ? apiUser.avatar : null,
      };

      persistAuth(authData, {
        remember: rememberMe,
        profile: apiUser
          ? {
              name: typeof apiUser.name === "string" ? apiUser.name : undefined,
              email: typeof apiUser.email === "string" ? apiUser.email : undefined,
              avatar: typeof apiUser.avatar === "string" ? apiUser.avatar : undefined,
            }
          : undefined,
      });
      setAuth(authData);
      trackEvent("login_success");
      navigate("/todo/tasks");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrors({
          server: error.response?.data?.message || "Invalid login credentials.",
        });
      } else {
        setErrors({
          server: "Unable to sign in right now. Please try again.",
        });
      }
      trackEvent("login_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="saas-auth-page saas-auth-page--login">
      <section className="saas-auth-card">
        <div className="saas-auth-copy">
          <p className="saas-eyebrow">Welcome Back</p>
          <h1>Return to your productivity command center</h1>
          <p>
            Pick up your workflow with live priorities, smart planning, and real-time progress
            visibility from one premium dashboard.
          </p>
          <img
            src={loginImage}
            alt="Premium productivity workspace"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = "/yono-logo.svg";
            }}
          />
        </div>

        <div className="saas-auth-form-wrap">
          <h2>Welcome Back</h2>
          <p>Sign in with your registered email and password.</p>

          {errors.server && (
            <p className="todoist-error" role="status" aria-live="polite">
              {errors.server}
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loginUser();
            }}
          >
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="todoist-input"
              value={user.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p className="todoist-error">{errors.email}</p>}

            <label htmlFor="login-password">Password</label>
            <div className="saas-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="todoist-input"
                value={user.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="saas-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="todoist-error">{errors.password}</p>}

            <div className="saas-auth-row">
              <label className="saas-auth-check" htmlFor="remember-login">
                <input
                  id="remember-login"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link className="todoist-link" to="/reset-password">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="todoist-btn-primary saas-auth-submit" disabled={loading}>
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <div className="saas-auth-divider">
            <span>or continue with</span>
          </div>

          <GoogleAuthButton mode="login" setAuth={setAuth} remember={rememberMe} />

          <p className="saas-auth-footnote">
            New to Yono Todolist? <Link className="todoist-link" to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
