import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { trackEvent } from "../lib/analytics";
import {
  normalizeReviewEmail,
  submitReview,
  type ReviewPayload,
  type StoredReview,
} from "../lib/reviews";

interface FeedbackForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
}

interface FeedbackErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  rating?: string;
}

interface ReviewModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (review: StoredReview) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultForm: FeedbackForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
  rating: 0,
};

const ratingLabels = ["Poor", "Fair", "Good", "Very good", "Excellent"];

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const validationErrors = error.response?.data?.errors;
    if (validationErrors) {
      const firstValidationError = Object.values(validationErrors)[0]?.[0];
      if (firstValidationError) return firstValidationError;
    }

    return error.response?.data?.message || "Unable to submit review right now. Please try again.";
  }

  return "Unable to submit review right now. Please try again.";
};

export default function ReviewModalForm({
  isOpen,
  onClose,
  onSubmitted,
}: ReviewModalFormProps) {
  const [form, setForm] = useState<FeedbackForm>(defaultForm);
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [status, setStatus] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const nextErrors: FeedbackErrors = {};
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    const cleanSubject = form.subject.trim();
    const cleanMessage = form.message.trim();

    if (cleanName.length < 2) nextErrors.name = "Please enter your full name.";
    if (!emailRegex.test(cleanEmail)) nextErrors.email = "Please enter a valid email address.";
    if (cleanSubject.length < 3) nextErrors.subject = "Please add a short review title.";
    if (cleanMessage.length < 20) nextErrors.message = "Review should be at least 20 characters.";
    if (form.rating < 1 || form.rating > 5) nextErrors.rating = "Please select a rating.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setField = <K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleClose = () => {
    if (submitting) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: ReviewPayload = {
      name: form.name.trim(),
      email: normalizeReviewEmail(form.email),
      subject: form.subject.trim(),
      message: form.message.trim(),
      rating: form.rating,
    };

    setStatus({ type: null, text: "" });
    setSubmitting(true);

    try {
      const review = await submitReview(payload);

      setForm(defaultForm);
      setErrors({});
      setStatus({
        type: "success",
        text: "Review submitted successfully. Thank you for sharing your feedback.",
      });
      onSubmitted?.(review);
      trackEvent("review_submit", { rating: payload.rating });

      closeTimerRef.current = window.setTimeout(() => {
        onClose();
        setStatus({ type: null, text: "" });
        closeTimerRef.current = null;
      }, 5000);
    } catch (error) {
      setStatus({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="review-modal-backdrop"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="review-modal-panel hide-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="review-modal-eyebrow">Write Review</span>
            <h2 id="review-modal-title">Share your experience</h2>
            <p>
              Your review will appear on the home page after it is saved in the backend.
            </p>
          </div>
          <button
            type="button"
            className="review-modal-close"
            onClick={handleClose}
            aria-label="Close review form"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form
          className="review-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="review-modal-grid">
            <div>
              <label className="review-modal-label" htmlFor="review-name">
                Name
              </label>
              <input
                id="review-name"
                className="todoist-input"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Manisha Sharma"
              />
              {errors.name && <p className="todoist-error">{errors.name}</p>}
            </div>

            <div>
              <label className="review-modal-label" htmlFor="review-email">
                Email
              </label>
              <input
                id="review-email"
                className="todoist-input"
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="you@example.com"
              />
              {errors.email && <p className="todoist-error">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="review-modal-label" htmlFor="review-subject">
              Review title
            </label>
            <input
              id="review-subject"
              className="todoist-input"
              value={form.subject}
              onChange={(event) => setField("subject", event.target.value)}
              placeholder="Very useful for daily planning"
            />
            {errors.subject && <p className="todoist-error">{errors.subject}</p>}
          </div>

          <div>
            <label className="review-modal-label">Star rating</label>
            <div className="review-modal-rating-row" role="radiogroup" aria-label="Review rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`review-modal-rating-btn ${form.rating >= star ? "is-active" : ""}`}
                  onClick={() => setField("rating", star)}
                  aria-pressed={form.rating >= star}
                >
                  <i className={form.rating >= star ? "bi bi-star-fill" : "bi bi-star"} />
                </button>
              ))}
              <span className="review-modal-rating-copy">
                {form.rating > 0 ? ratingLabels[form.rating - 1] : "Choose a rating"}
              </span>
            </div>
            {errors.rating && <p className="todoist-error">{errors.rating}</p>}
          </div>

          <div>
            <label className="review-modal-label" htmlFor="review-message">
              Review message
            </label>
            <textarea
              id="review-message"
              className="todoist-textarea"
              rows={5}
              value={form.message}
              onChange={(event) => setField("message", event.target.value)}
              placeholder="Tell people what helped you most, what felt smooth, and why you would recommend it."
            />
            {errors.message && <p className="todoist-error">{errors.message}</p>}
          </div>

          {status.text && (
            <p className={`review-modal-status ${status.type === "success" ? "is-success" : "is-error"}`}>
              {status.text}
            </p>
          )}

          <div className="review-modal-actions">
            <button
              type="button"
              className="btn-secondary review-modal-cancel"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary review-modal-submit" disabled={submitting}>
              {submitting ? "Saving review..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
