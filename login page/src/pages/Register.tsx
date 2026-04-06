import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import GoogleAuthButton from "../components/auth/GoogleAuthButton";
import { useSeo } from "../hooks/useSeo";
import { trackEvent } from "../lib/analytics";
import { apiClient, apiRoutes } from "../lib/api";
import { type AuthState } from "../lib/auth";

interface RegisterForm {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterErrors {
  fullname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  server?: string;
}

interface RegisterProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

const registerImage = "/home-product-preview.svg";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordStrength = (password: string) => {
  if (password.length < 8) return { text: "Weak", color: "#b42318" };
  if (password.match(/[A-Z]/) && password.match(/[a-z]/) && password.match(/[0-9]/)) {
    return { text: "Strong", color: "#15803d" };
  }
  return { text: "Medium", color: "#b45309" };
};

export default function Register({ setAuth }: RegisterProps) {
  useSeo({
    title: "Register",
    description:
      "Create your Yono Todolist account and unlock protected task planning, tracking, and profile settings.",
    path: "/register",
  });

  const [form, setForm] = useState<RegisterForm>({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const strength = getPasswordStrength(form.password);
  const navigate = useNavigate();

  const validate = () => {
    const nextErrors: RegisterErrors = {};
    const fullName = form.fullname.trim();
    const email = form.email.trim().toLowerCase();

    if (fullName.length < 2) nextErrors.fullname = "Please enter your full name.";
    if (!emailRegex.test(email)) nextErrors.email = "Please enter a valid email address.";
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!acceptTerms) {
      nextErrors.terms = "Please accept the terms to continue.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setField = (key: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, server: undefined }));
    setSuccess("");
  };

  const registerUser = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        fullname: form.fullname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      const res = await apiClient.post(apiRoutes.register, payload);
      setSuccess(res.data.message || "Account created successfully.");
      setForm({ fullname: "", email: "", password: "", confirmPassword: "" });
      setAcceptTerms(false);
      setErrors({});
      trackEvent("register_success");
      
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrors({
          server: error.response?.data?.message || "Something went wrong. Try again.",
        });
      } else {
        setErrors({
          server: "Unable to create account right now. Please try again.",
        });
      }
      trackEvent("register_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="saas-auth-page saas-auth-page--register">
      <section className="saas-auth-card">
        <div className="saas-auth-copy">
          <p className="saas-eyebrow">Create Your Account</p>
          <h1>Launch your premium productivity workspace</h1>
          <p>
            Join Yono Todolist and manage tasks with modern planning tools, clear priorities, and
            polished execution flows from day one.
          </p>
          <img src={registerImage} alt="Professional productivity setup" loading="lazy" decoding="async" />
        </div>

        <div className="saas-auth-form-wrap">
          <h2>Create My Account</h2>
          <p>Register now and unlock your full dashboard workspace.</p>

          {errors.server && (
            <p className="todoist-error" role="status" aria-live="polite">
              {errors.server}
            </p>
          )}
          {success && (
            <p className="todoist-success" role="status" aria-live="polite">
              {success}
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void registerUser();
            }}
          >
            <label htmlFor="register-fullname">Full Name</label>
            <input
              id="register-fullname"
              className="todoist-input"
              value={form.fullname}
              onChange={(e) => setField("fullname", e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
            {errors.fullname && <p className="todoist-error">{errors.fullname}</p>}

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              className="todoist-input"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p className="todoist-error">{errors.email}</p>}

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              className="todoist-input"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
            />
            {errors.password && <p className="todoist-error">{errors.password}</p>}

            <label htmlFor="register-confirm-password">Confirm Password</label>
            <input
              id="register-confirm-password"
              type="password"
              className="todoist-input"
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && <p className="todoist-error">{errors.confirmPassword}</p>}

            {form.password && (
              <p className="todoist-muted saas-password-strength">
                Password strength: <strong style={{ color: strength.color }}>{strength.text}</strong>
              </p>
            )}

            <label className="saas-auth-check" htmlFor="register-terms">
              <input
                id="register-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => {
                  setAcceptTerms(event.target.checked);
                  setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
              />
              <span>
                I agree to the <Link className="todoist-link" to="/terms">Terms</Link> and{" "}
                <Link className="todoist-link" to="/privacy">Privacy Policy</Link>
              </span>
            </label>
            {errors.terms && <p className="todoist-error">{errors.terms}</p>}

            <button type="submit" className="todoist-btn-primary saas-auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create My Account"}
            </button>
          </form>

          <div className="saas-auth-divider">
            <span>or continue with</span>
          </div>

          <GoogleAuthButton
            mode="register"
            setAuth={setAuth}
            canContinue={acceptTerms}
            blockedMessage="Accept the Terms and Privacy Policy to continue with Google."
          />

          <p className="saas-auth-footnote">
            Already have an account? <Link className="todoist-link" to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
