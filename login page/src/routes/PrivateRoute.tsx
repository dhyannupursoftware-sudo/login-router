import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface AuthType {
  token: string | null;
  role: "admin" | "user" | null;
}

interface PrivateProps {
  auth: AuthType;
  role: "admin" | "user";
  children: ReactNode;
}

export default function PrivateRoute({ auth, role, children }: PrivateProps) {
  if (!auth.token) return <Navigate to="/login" replace />;
  if (auth.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
