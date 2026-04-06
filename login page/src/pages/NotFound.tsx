import { Link } from "react-router-dom";
import { useSeo } from "../hooks/useSeo";

export default function NotFound() {
  useSeo({
    title: "Page Not Found",
    description: "The page you requested could not be found on Yono Todolist.",
    path: "/404",
    noIndex: true,
  });

  return (
    <div className="todoist-center-card" style={{ textAlign: "center" }}>
      <h1>404 - Page not found</h1>
      <p className="todoist-muted" style={{ marginBottom: 12 }}>
        The route you requested is unavailable or moved to a new location.
      </p>
      <p className="todoist-muted" style={{ marginBottom: 16 }}>
        Continue from Home, open your workspace dashboard, or use navigation links to access
        profile, settings, and task center.
      </p>
      <Link to="/" className="todoist-btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
