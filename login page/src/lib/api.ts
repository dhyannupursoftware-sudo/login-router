import axios from "axios";
import { readSavedAuth } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  ""
);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = readSavedAuth().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const apiRoutes = {
  login: "/api/login",
  register: "/api/register",
  googleConfig: "/api/auth/google/config",
  googleAuth: "/api/auth/google",
  requestPasswordOtp: "/api/reset-password/request-otp",
  resetPassword: "/api/reset-password",
  feedbacks: "/api/feedbacks",
  comments: "/api/comments",
  contact: "/api/contact",
  tasks: "/api/tasks",
  workspacePreferences: "/api/workspace/preferences",
} as const;

export { API_BASE_URL };
