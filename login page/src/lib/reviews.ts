import { apiClient, apiRoutes } from "./api";

export interface StoredReview {
  id?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  createdAt: string;
}

export interface ReviewPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
}

type FeedbackApiRecord = {
  id?: number;
  name?: string;
  email?: string;
  subject?: string | null;
  message?: string;
  rating?: number | string;
  created_at?: string;
  createdAt?: string;
};

const DEFAULT_REVIEW_SUBJECT = "Community review";

export const normalizeReviewEmail = (value: string): string => value.trim().toLowerCase();

const normalizeReviewRecord = (value: unknown): StoredReview | null => {
  if (!value || typeof value !== "object") return null;

  const review = value as FeedbackApiRecord;
  const ratingValue =
    typeof review.rating === "number" ? review.rating : Number.parseInt(String(review.rating), 10);
  const createdAt = review.createdAt ?? review.created_at ?? new Date().toISOString();

  if (
    typeof review.name !== "string" ||
    typeof review.email !== "string" ||
    typeof review.message !== "string" ||
    !Number.isFinite(ratingValue)
  ) {
    return null;
  }

  return {
    id: review.id,
    name: review.name,
    email: normalizeReviewEmail(review.email),
    subject:
      typeof review.subject === "string" && review.subject.trim()
        ? review.subject.trim()
        : DEFAULT_REVIEW_SUBJECT,
    message: review.message,
    rating: Math.min(5, Math.max(1, Math.round(ratingValue))),
    createdAt,
  };
};

const getReviewTime = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortReviews = (reviews: StoredReview[]): StoredReview[] =>
  reviews.sort((left, right) => getReviewTime(right.createdAt) - getReviewTime(left.createdAt));

const normalizeReviewCollection = (value: unknown): StoredReview[] => {
  if (!Array.isArray(value)) return [];

  return sortReviews(
    value
      .map((item) => normalizeReviewRecord(item))
      .filter((item): item is StoredReview => item !== null)
  );
};

const emitReviewUpdate = (detail: StoredReview | StoredReview[]): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-reviews-updated", { detail }));
  }
};

export const fetchReviews = async (): Promise<StoredReview[]> => {
  const response = await apiClient.get<{ data?: unknown } | unknown[]>(apiRoutes.feedbacks);
  const payload = Array.isArray(response.data) ? response.data : response.data?.data;

  return normalizeReviewCollection(payload);
};

export const submitReview = async (payload: ReviewPayload): Promise<StoredReview> => {
  const response = await apiClient.post<{ data?: unknown }>(apiRoutes.feedbacks, {
    ...payload,
    email: normalizeReviewEmail(payload.email),
  });

  const review = normalizeReviewRecord(response.data?.data);
  if (!review) {
    throw new Error("Invalid review response.");
  }

  emitReviewUpdate(review);
  return review;
};
