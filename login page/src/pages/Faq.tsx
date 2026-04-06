import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "../hooks/useSeo";
import "../todoist.css";

interface FaqItem {
  category: "general" | "account" | "security" | "productivity";
  q: string;
  a: string;
}

const faqData: FaqItem[] = [
  {
    category: "general",
    q: "Who is this app built for?",
    a: "Yono Todolist is built for founders, teams, freelancers, and students who want clear planning and reliable daily execution.",
  },
  {
    category: "general",
    q: "Can I use this on desktop and mobile?",
    a: "Yes. The interface is responsive and optimized for both desktop and mobile workflows.",
  },
  {
    category: "general",
    q: "What makes this different from a simple notes app?",
    a: "It combines task structure, priorities, due dates, progress tracking, and workflow views in one professional system.",
  },
  {
    category: "general",
    q: "Is this suitable for personal productivity too?",
    a: "Yes. You can run personal routines, study plans, and habit workflows just as easily as team projects.",
  },
  {
    category: "account",
    q: "Do I need an account to use dashboard features?",
    a: "Yes. Dashboard and workspace pages are protected routes and require login.",
  },
  {
    category: "account",
    q: "How do I create an account?",
    a: "Open Register, add your full name, email, password, and confirm details to create your account.",
  },
  {
    category: "account",
    q: "Can I reset my password later?",
    a: "Yes. You can use the reset password flow from the login area.",
  },
  {
    category: "account",
    q: "Can one email submit multiple reviews?",
    a: "No. Only one review per email is accepted to keep feedback trusted and high quality.",
  },
  {
    category: "security",
    q: "Are private pages blocked for non-logged users?",
    a: "Yes. Unauthorized users are redirected and cannot access private workspace routes.",
  },
  {
    category: "security",
    q: "Is my session handled securely?",
    a: "Yes. Auth session checks control route access and protect private workflows.",
  },
  {
    category: "security",
    q: "Can I control visual accessibility settings?",
    a: "Yes. Settings include options such as reduced motion, contrast preferences, and density controls.",
  },
  {
    category: "security",
    q: "Can I disable analytics or activity sharing?",
    a: "Yes. Privacy-focused controls are available inside settings.",
  },
  {
    category: "productivity",
    q: "How do I prioritize important tasks first?",
    a: "Use priority levels, due dates, and filtered task views to keep high-impact work visible.",
  },
  {
    category: "productivity",
    q: "Can I track pending vs completed work quickly?",
    a: "Yes. Task center filters and status views make it easy to monitor progress in real time.",
  },
  {
    category: "productivity",
    q: "Does it support timeline and calendar style planning?",
    a: "Yes. Timeline and calendar-oriented modes are available for date-based planning.",
  },
  {
    category: "productivity",
    q: "Can I manage team and personal tasks together?",
    a: "Yes. Use categories and filters to keep workstreams organized within one unified workspace.",
  },
  {
    category: "productivity",
    q: "How does this help reduce missed deadlines?",
    a: "Due date visibility, priority controls, and dashboard progress indicators help detect delays early.",
  },
  {
    category: "productivity",
    q: "Can I review performance weekly?",
    a: "Yes. Dashboard summaries and completion trends are ideal for weekly and monthly review meetings.",
  },
];

const categories = ["all", "general", "account", "security", "productivity"] as const;

type CategoryFilter = (typeof categories)[number];

export default function Faq() {
  useSeo({
    title: "FAQ",
    description:
      "Frequently asked questions about Yono Todolist productivity workflows, account setup, and security.",
    path: "/faq",
  });

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [search, setSearch] = useState<CategoryFilter>("all");

  const filteredFaqs = useMemo(
    () => (search === "all" ? faqData : faqData.filter((item) => item.category === search)),
    [search]
  );

  return (
    <div className="todoist-page-wrap">
      {/* Hero Section */}
      <section className="td-hero" style={{ paddingBottom: "40px" }}>
        <p style={{ color: "var(--td-accent)", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Support Center</p>
        <h1>How can we help you today?</h1>
        <p>
          Clear answers about planning, account setup, security, and day-to-day task management.
        </p>
      </section>

      {/* Topics Grid */}
      <section className="td-trust-section" style={{ padding: "0 20px 40px", maxWidth: "1200px", margin: "0 auto" }}>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "20px" }}>
            <div style={{ padding: "30px 20px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", cursor: "pointer", transition: "transform 0.2s" }} className="td-hover-card" onClick={() => setSearch("general")}>
               <i className="bi bi-person-badge" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "15px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.2rem", color: "var(--td-text)", marginBottom: "5px" }}>General</h3>
               <p style={{ color: "var(--td-muted)", fontSize: "0.95rem", margin: 0 }}>Basic usage & platform</p>
            </div>
            <div style={{ padding: "30px 20px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", cursor: "pointer", transition: "transform 0.2s" }} className="td-hover-card" onClick={() => setSearch("account")}>
               <i className="bi bi-shield-lock" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "15px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.2rem", color: "var(--td-text)", marginBottom: "5px" }}>Account</h3>
               <p style={{ color: "var(--td-muted)", fontSize: "0.95rem", margin: 0 }}>Billing & profiles</p>
            </div>
            <div style={{ padding: "30px 20px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", cursor: "pointer", transition: "transform 0.2s" }} className="td-hover-card" onClick={() => setSearch("productivity")}>
               <i className="bi bi-graph-up-arrow" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "15px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.2rem", color: "var(--td-text)", marginBottom: "5px" }}>Productivity</h3>
               <p style={{ color: "var(--td-muted)", fontSize: "0.95rem", margin: 0 }}>Workflows & tips</p>
            </div>
            <div style={{ padding: "30px 20px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", cursor: "pointer", transition: "transform 0.2s" }} className="td-hover-card" onClick={() => setSearch("security")}>
               <i className="bi bi-fingerprint" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "15px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.2rem", color: "var(--td-text)", marginBottom: "5px" }}>Security</h3>
               <p style={{ color: "var(--td-muted)", fontSize: "0.95rem", margin: 0 }}>Data & privacy</p>
            </div>
         </div>
      </section>

      {/* Filter Row */}
      <section className="td-trust-section" style={{ padding: "20px", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`td-faq-filter-btn ${search === category ? "active" : ""}`}
            onClick={() => {
              setSearch(category);
              setActiveItemId(null);
            }}
          >
            {category.toUpperCase()}
          </button>
        ))}
      </section>

      {/* FAQ List */}
      <section className="td-trust-section" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
        {filteredFaqs.map((item, index) => {
          const id = `${item.category}-${index}`;
          const isOpen = activeItemId === id;

          return (
            <div key={id} className={`td-faq-item ${isOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="td-faq-question"
                aria-expanded={isOpen}
                onClick={() => setActiveItemId(isOpen ? null : id)}
              >
                <span>{item.q}</span>
                <span className="td-faq-symbol" aria-hidden="true">+</span>
              </button>

              <div className="td-faq-answer" aria-hidden={!isOpen}>
                <div className="td-faq-answer-inner">
                  <div className="td-faq-answer-content">
                     <p>{item.a}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredFaqs.length === 0 && (
           <p style={{ textAlign: "center", color: "var(--td-muted)" }}>No questions found for this category.</p>
        )}
      </section>

      {/* Contact Fields / Still need help */}
      <section className="td-trust-section" style={{ padding: "80px 20px", margin: "40px auto", maxWidth: "1000px" }}>
         <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "40px", fontSize: "2.2rem" }}>Still have questions?</h2>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "40px", width: "100%" }}>
            <div style={{ padding: "40px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", boxShadow: "var(--td-shadow)", textAlign: "center" }}>
               <i className="bi bi-chat-dots" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "20px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.4rem", color: "var(--td-text)", marginBottom: "15px", fontWeight: "700" }}>Live Chat</h3>
               <p style={{ color: "var(--td-muted)", marginBottom: "30px", lineHeight: "1.6", fontSize: "1.05rem" }}>Our support team is available 24/7 to help you with any technical issues or workflow queries.</p>
               <Link to="/ask-question" className="td-btn-secondary">Start Chat</Link>
            </div>
            
            <div style={{ padding: "40px", background: "var(--td-surface)", borderRadius: "var(--td-radius-md)", border: "1px solid var(--td-border)", boxShadow: "var(--td-shadow)", textAlign: "center" }}>
               <i className="bi bi-envelope" style={{ fontSize: "2.5rem", color: "var(--td-accent)", marginBottom: "20px", display: "inline-block" }}></i>
               <h3 style={{ fontSize: "1.4rem", color: "var(--td-text)", marginBottom: "15px", fontWeight: "700" }}>Email Support</h3>
               <p style={{ color: "var(--td-muted)", marginBottom: "30px", lineHeight: "1.6", fontSize: "1.05rem" }}>Prefer to write? Drop us an email detailing your issue and we'll get back to you within 24 hours.</p>
               <a href="mailto:support@yono.com" className="td-btn-secondary">Email Us</a>
            </div>
         </div>
      </section>
    </div>
  );
}

