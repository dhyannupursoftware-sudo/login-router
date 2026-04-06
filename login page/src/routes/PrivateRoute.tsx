import { Navigate } from "react-router-dom";
import React from "react";
import { hasValidToken, readSavedAuth, type AuthState } from "../lib/auth";

export default function PrivateRoute({
  children,
  auth,
}: {
  children: React.ReactNode;
  auth?: AuthState;
}) {
  if (hasValidToken(auth?.token)) {
    return <>{children}</>;
  }

  const storedAuth = readSavedAuth();
  if (hasValidToken(storedAuth.token)) {
    return <>{children}</>;
  }

  return <Navigate to="/login" replace />;
}
