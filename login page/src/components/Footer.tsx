import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
];

const env = import.meta.env as Record<string, string | undefined>;

const socialLinks = [
  {
    href: env.VITE_SOCIAL_FACEBOOK_URL || "https://facebook.com",
    label: "Facebook",
    icon: "bi bi-facebook",
    tone: "facebook",
  },
  {
    href: env.VITE_SOCIAL_INSTAGRAM_URL || "https://www.instagram.com/__dhkk__?igsh=dnY2eXVudGh4aDRo",
    label: "Instagram",
    icon: "bi bi-instagram",
    tone: "instagram",
  },
  {
    href: env.VITE_SOCIAL_TWITTER_URL || "https://twitter.com",
    label: "Twitter",
    icon: "bi bi-twitter",
    tone: "twitter",
  },
  {
    href: env.VITE_SOCIAL_GITHUB_URL || "https://github.com/dhyannupursoftware-sudo",
    label: "GitHub",
    icon: "bi bi-github",
    tone: "github",
  },
] as const;

interface FooterProps {
  isAuthenticated?: boolean;
}

export default function Footer({ isAuthenticated = false }: FooterProps) {
  const year = new Date().getFullYear();
  const handleFooterNavClick = () => {
    window.scrollTo(0, 0);
  };

  return (
    <footer className={`site-footer ${isAuthenticated ? "site-footer--auth-centered" : ""}`}>
      <div className="site-footer__inner">
        <section className="site-footer__column site-footer__about">
          <h3 className="site-footer__heading">Smart Todo</h3>
          <p className="site-footer__text">
            Smart Todo Management System is a modern full-stack application
            designed to help users manage daily tasks efficiently with a clean,
            secure and scalable architecture.
          </p>
          <p className="site-footer__text">
            Built with productivity, performance and simplicity in mind using
            modern web technologies.
          </p>
        </section>

        {!isAuthenticated && (
          <section className="site-footer__column">
            <h3 className="site-footer__heading">Quick Links</h3>
            <ul className="site-footer__list">
              {quickLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="site-footer__link" onClick={handleFooterNavClick}>
                    {item.label}
                  </Link> 
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="site-footer__column">
          <h3 className="site-footer__heading">Contact Info</h3>
          <p className="site-footer__info">
            <span className="site-footer__label">Name:</span> Dhyan Patel
          </p>
          <p className="site-footer__info">
            <span className="site-footer__label">Phone:</span> +91 8347030968
          </p>
          <p className="site-footer__info">
            <span className="site-footer__label">Email:</span>{" "}
            <a href="mailto:pateldhayan041@gmail.com" className="site-footer__email">
              pateldhayan041@gmail.com
            </a>
          </p>
          <p className="site-footer__info">
            <span className="site-footer__label">Support:</span> Mon - Sat, 10:00 AM - 7:00 PM
          </p>
          <p className="site-footer__info">
            <span className="site-footer__label">Location:</span> India
          </p>
          <p className="site-footer__text">
            Feel free to reach out for collaboration, feedback or project
            opportunities.
          </p>
        </section>

        <section className="site-footer__column">
          <h3 className="site-footer__heading">Social Links</h3>
          <div className="site-footer__social-grid">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer__social-item"
              >
                <span
                  className={`site-footer__logo site-footer__logo--${item.tone}`}
                  aria-hidden="true"
                >
                  <i className={item.icon} />
                </span>
                <span className="site-footer__social-name">{item.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="site-footer__divider" />

      <div className="site-footer__bottom">
        <p className="site-footer__copyright">
          &copy; {year} Smart Todo Management System. All rights reserved.
        </p>
        <p className="site-footer__legal-inline">
          <Link to="/privacy" className="site-footer__legal-link" onClick={handleFooterNavClick}>
            Privacy
          </Link>
          <span aria-hidden="true">|</span>
          <Link to="/terms" className="site-footer__legal-link" onClick={handleFooterNavClick}>
            Terms
          </Link>
        </p>
        <p className="site-footer__created-by">
          Created by <strong>Dhyan Patel</strong>
        </p>
      </div>
    </footer>
  );
}
