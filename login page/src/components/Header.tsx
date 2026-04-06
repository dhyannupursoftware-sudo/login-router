import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { matchesScopedStorageKey, readScopedStorageItem } from "../lib/workspaceStorage";

interface HeaderProps {
  auth: { token: string | null; role: string | null };
}

interface UserProfile {
  companyName?: string;
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const readProfile = (): UserProfile => {
  const raw = readScopedStorageItem("app-profile");
  if (!raw) return { companyName: "" };

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      companyName: normalizeText(parsed.companyName || ""),
    };
  } catch {
    return { companyName: "" };
  }
};

export default function Header({ auth }: HeaderProps) {
  const location = useLocation();

  const [profileCompanyName, setProfileCompanyName] = useState(() => readProfile().companyName || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  useEffect(() => {
    const sync = () => {
      const next = readProfile();
      setProfileCompanyName(next.companyName || "");
    };

    const onStorage = (event: StorageEvent) => {
      if (!matchesScopedStorageKey("app-profile", event.key)) return;
      sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("app-profile-updated", sync as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("app-profile-updated", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const navClass = (path: string) =>
    `header-nav-link ${location.pathname === path ? "active" : ""}`;
  const showPublicNav = !auth.token;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-link" to={auth.token ? "/todo/tasks" : "/"} onClick={closeMobileMenu}>
          <span className="brand-mark">
            <img src="/yono-favicon.svg" alt="Yono Logo" className="brand-logo" />
          </span>
          <span className="brand-name">Yono Todolist</span>
        </Link>

        {auth.token && profileCompanyName && (
          <p className="header-company-badge" title={profileCompanyName}>
            {profileCompanyName}
          </p>
        )}

        {showPublicNav && (
          <>
            <button
              type="button"
              className="header-menu-btn"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="public-site-menu"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>

            <nav id="public-site-menu" className={`header-nav ${mobileOpen ? "open" : ""}`}>
              <Link to="/" className={navClass("/")} onClick={closeMobileMenu}>Home</Link>
              <Link to="/about" className={navClass("/about")} onClick={closeMobileMenu}>About</Link>
              <Link to="/faq" className={navClass("/faq")} onClick={closeMobileMenu}>FAQ</Link>
              <Link to="/contact" className={navClass("/contact")} onClick={closeMobileMenu}>Contact</Link>
              <Link to="/login" className="todoist-btn-ghost" onClick={closeMobileMenu}>Log in</Link>
              <Link to="/register" className="todoist-btn-primary" onClick={closeMobileMenu}>Start for free</Link>
            </nav>
          </>
        )}

      </div>
    </header>
  );
}
