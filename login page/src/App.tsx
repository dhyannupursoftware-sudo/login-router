import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import TodoWorkspace from "./components/todo/TodoWorkspace";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import PrivateRoute from "./routes/PrivateRoute";
import About from "./pages/About";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import AskQuestion from "./pages/AskQuestion";
import { initializeAnalytics, trackPageView } from "./lib/analytics";
import { hasValidToken, readSavedAuth, type AuthState } from "./lib/auth";
import { readScopedStorageItem } from "./lib/workspaceStorage";

type ThemeMode = "light" | "dark";

interface AppSettings {
  theme?: ThemeMode;
  compactMode?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  denseInputs?: boolean;
  focusMode?: boolean;
}

const applySettings = (): void => {
  const raw = readScopedStorageItem("app-settings");
  let settings: AppSettings = { theme: "dark" };

  if (raw) {
    try {
      settings = { ...settings, ...(JSON.parse(raw) as AppSettings) };
    } catch {
      settings = { theme: "dark" };
    }
  }

  document.documentElement.setAttribute("data-theme", settings.theme === "light" ? "light" : "dark");

  const classes: Array<[string, boolean]> = [
    ["compact-mode", Boolean(settings.compactMode)],
    ["reduced-motion", Boolean(settings.reducedMotion)],
    ["high-contrast", Boolean(settings.highContrast)],
    ["dense-inputs", Boolean(settings.denseInputs)],
    ["focus-mode", Boolean(settings.focusMode)],
  ];

  classes.forEach(([className, enabled]) => {
    if (enabled) document.body.classList.add(className);
    else document.body.classList.remove(className);
  });
};

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => readSavedAuth());

  useEffect(() => {
    applySettings();
    initializeAnalytics();

    const syncSettings = () => applySettings();
    window.addEventListener("app-settings-updated", syncSettings as EventListener);
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener("app-settings-updated", syncSettings as EventListener);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    const syncAuth = (event: StorageEvent) => {
      if (event.key !== null && event.key !== "auth") return;
      setAuth(readSavedAuth());
    };

    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  return (
    <Router>
      <AppShell auth={auth} setAuth={setAuth} />
    </Router>
  );
}

function AppShell({
  auth,
  setAuth,
}: {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const pathWithQuery = `${location.pathname}${location.search || ""}`;
    trackPageView(pathWithQuery);
  }, [location.pathname, location.search]);

  const isAuthenticated = hasValidToken(auth.token);
  const isWorkspaceRoute =
    location.pathname.startsWith("/todo") ||
    location.pathname === "/profile" ||
    location.pathname === "/settings";
  const routeAnimationKey = isWorkspaceRoute ? "workspace-route-shell" : `${location.pathname}${location.search}`;
  const routeContent = (
    <div key={routeAnimationKey} className="app-route-transition">
      <Routes location={location}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/todo/tasks" replace /> : <Home />}
        />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/ask-question" element={<AskQuestion />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/todo/tasks" replace /> : <Login setAuth={setAuth} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/todo/tasks" replace /> : <Register setAuth={setAuth} />
          }
        />
        <Route
          path="/reset-password"
          element={isAuthenticated ? <Navigate to="/todo/tasks" replace /> : <ResetPassword />}
        />

        <Route
          path="/todo/*"
          element={
            <PrivateRoute auth={auth}>
              <TodoWorkspaceShell />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute auth={auth}>
              <ProfilePage setAuth={setAuth} />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute auth={auth}>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );

  return (
    <div className="app-shell">
      {!isWorkspaceRoute && <Header auth={auth} />}
      {isWorkspaceRoute ? (
        <>
          {routeContent}
        </>
      ) : (
        <div className="public-site-main">
          {routeContent}
          <Footer isAuthenticated={isAuthenticated} />
        </div>
      )}
    </div>
  );
}

function TodoWorkspaceShell() {
  const location = useLocation();
  const isAddRoute = location.pathname === "/todo" || location.pathname === "/todo/add";
  const initialFilter =
    location.pathname === "/todo/completed"
      ? "completed"
      : location.pathname === "/todo/pending"
        ? "pending"
        : "all";

  return <TodoWorkspace view={isAddRoute ? "add" : "tasks"} initialFilter={initialFilter} />;
}
