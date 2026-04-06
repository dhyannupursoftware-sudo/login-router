import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { useSeo } from "../hooks/useSeo";
import { trackEvent } from "../lib/analytics";
import { apiClient, apiRoutes } from "../lib/api";

interface ResetErrors {
  email?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
  server?: string;
}

const resetImage =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const OTP_LENGTH = 6;

export default function ResetPassword() {
  useSeo({
    title: "Reset Password",
    description:
      "Reset your Yono Todolist password securely and get back to your task workspace.",
    path: "/reset-password",
    noIndex: true,
  });

  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetErrors>({});
  const [success, setSuccess] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();

  const getPasswordStrength = (value: string) => {
    if (value.length < 8) return { text: "Weak", color: "#b42318" };
    if (passwordRegex.test(value)) {
      return { text: "Strong", color: "#15803d" };
    }
    return { text: "Medium", color: "#b45309" };
  };

  const otpValue = otpDigits.join("");

  const setFieldErrorState = (nextErrors: ResetErrors) => {
    setErrors(nextErrors);
  };

  const extractServerErrors = (error: unknown, fallbackMessage: string): ResetErrors => {
    if (!axios.isAxiosError(error)) {
      return { server: fallbackMessage };
    }

    const responseErrors = error.response?.data?.errors as
      | Record<string, string[] | undefined>
      | undefined;

    const nextErrors: ResetErrors = {
      email: responseErrors?.email?.[0],
      otp: responseErrors?.otp?.[0],
      password: responseErrors?.password?.[0],
      confirmPassword: responseErrors?.password_confirmation?.[0],
    };

    const hasFieldError = Object.values(nextErrors).some(Boolean);

    return hasFieldError
      ? nextErrors
      : {
          ...nextErrors,
          server: error.response?.data?.message || fallbackMessage,
        };
  };

  const validateOtpRequest = () => {
    const nextErrors: ResetErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) nextErrors.email = "Please enter a valid email address.";
    setErrors((prev) => ({ ...prev, email: nextErrors.email, server: undefined }));
    return Object.keys(nextErrors).length === 0;
  };

  const validate = () => {
    const nextErrors: ResetErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) nextErrors.email = "Please enter a valid email address.";
    if (!/^\d{6}$/.test(otpValue)) nextErrors.otp = "Enter the 6-digit verification code.";
    if (!passwordRegex.test(password)) {
      nextErrors.password =
        "Password must be 8+ characters and include uppercase, lowercase, and a number.";
    }
    if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateOtpRequest()) return;

    setSendingCode(true);
    setSuccess("");

    try {
      const res = await apiClient.post(apiRoutes.requestPasswordOtp, {
        email: email.trim().toLowerCase(),
      });

      setErrors({});
      setOtpSent(true);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setSuccess(res.data.message || "Verification code sent successfully.");
      trackEvent("password_reset_otp_requested");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (error: unknown) {
      setFieldErrorState(extractServerErrors(error, "Unable to send the verification code."));
      trackEvent("password_reset_otp_request_failed");
    } finally {
      setSendingCode(false);
    }
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    setSuccess("");

    try {
      const res = await apiClient.post(apiRoutes.resetPassword, {
        email: email.trim().toLowerCase(),
        otp: otpValue,
        password,
        password_confirmation: confirmPassword,
      });
      setErrors({});
      setSuccess(res.data.message || "Password reset successful.");
      trackEvent("password_reset_success");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error: unknown) {
      setFieldErrorState(extractServerErrors(error, "Unable to reset password. Please try again."));
      trackEvent("password_reset_failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);

    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = nextDigit;
      return next;
    });

    setErrors((prev) => ({ ...prev, otp: undefined, server: undefined }));
    setSuccess("");

    if (nextDigit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (!pastedDigits) return;

    event.preventDefault();

    const nextDigits = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pastedDigits[index] ?? "");

    setOtpDigits(nextDigits);
    setErrors((prev) => ({ ...prev, otp: undefined, server: undefined }));
    setSuccess("");

    const focusIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const strength = getPasswordStrength(password);

  return (
    <main className="saas-auth-page saas-auth-page--reset">
      <section className="saas-auth-card">
        <div className="saas-auth-copy">
          <p className="saas-eyebrow">Account Recovery</p>
          <h1>Reset your password and get back to work</h1>
          <p>
            Update your account credentials with a strong new password and return to your task
            workspace without delays.
          </p>
          <img src={resetImage} alt="Password reset security" loading="lazy" decoding="async" />
        </div>

        <div className="saas-auth-form-wrap">
          <h2>Reset password</h2>
          <p>Enter your email, verify the 6-digit OTP, and create a strong new password.</p>

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
              void handleReset();
            }}
          >
            <label htmlFor="reset-email">Email</label>
            <div className="saas-auth-inline-group">
              <input
                id="reset-email"
                type="email"
                className="todoist-input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setOtpSent(false);
                  setOtpDigits(Array(OTP_LENGTH).fill(""));
                  setErrors((prev) => ({ ...prev, email: undefined, otp: undefined, server: undefined }));
                  setSuccess("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <button
                type="button"
                className="todoist-btn-primary saas-auth-inline-action"
                onClick={() => {
                  void handleSendOtp();
                }}
                disabled={sendingCode}
              >
                {sendingCode ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
            {errors.email && <p className="todoist-error">{errors.email}</p>}

            <label htmlFor="otp-digit-0">Verification code</label>
            <div className="saas-otp-row">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-digit-${index}`}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="saas-otp-input"
                  value={digit}
                  maxLength={1}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  aria-label={`Verification code digit ${index + 1}`}
                />
              ))}
            </div>
            <p className="todoist-muted saas-otp-caption">
              {otpSent
                ? "Enter one number in each box. Use the latest code sent to your email."
                : "Send OTP first, then enter one number in each box."}
            </p>
            {errors.otp && <p className="todoist-error">{errors.otp}</p>}

            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              type="password"
              className="todoist-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined, server: undefined }));
                setSuccess("");
              }}
              placeholder="Create a new password"
              autoComplete="new-password"
            />
            {errors.password && <p className="todoist-error">{errors.password}</p>}

            {password && (
              <p className="todoist-muted saas-password-strength">
                Password strength: <strong style={{ color: strength.color }}>{strength.text}</strong>
              </p>
            )}

            <label htmlFor="reset-password-confirm">Confirm password</label>
            <input
              id="reset-password-confirm"
              type="password"
              className="todoist-input"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined, server: undefined }));
                setSuccess("");
              }}
              placeholder="Confirm your new password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && <p className="todoist-error">{errors.confirmPassword}</p>}

            <button type="submit" className="todoist-btn-primary saas-auth-submit" disabled={loading}>
              {loading ? "Resetting..." : "Verify OTP & reset password"}
            </button>
          </form>

          <div className="saas-auth-validation-note" aria-label="Reset password requirements">
            <p>Validation details</p>
            <ul>
              <li>Email must be a valid, registered account email.</li>
              <li>OTP must be exactly 6 digits, one digit per box.</li>
              <li>Password must be at least 8 characters with uppercase, lowercase, and one number.</li>
              <li>Confirm password must match the new password exactly.</li>
            </ul>
          </div>

          <p className="saas-auth-footnote">
            Back to <Link className="todoist-link" to="/login">login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
