import { useSeo } from "../hooks/useSeo";
import DetailedContactForm from "../components/DetailedContactForm";
import "../todoist.css";

export default function Contact() {
  useSeo({
    title: "Contact",
    description: "Get in touch with the Yono Todolist team. Share workflow suggestions, report issues, and request support.",
    path: "/contact",
  });

  return (
    <div className="todoist-page-wrap" style={{ paddingBottom: "60px" }}>
      <section className="td-hero" style={{ paddingTop: "60px", paddingBottom: "20px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "15px", color: "var(--td-text)" }}>Let's talk</h1>
        <p style={{ color: "var(--td-muted)", maxWidth: "600px", margin: "0 auto", fontSize: "1.05rem" }}>
          We review every message carefully. Share what you need, what feels slow, and how we can improve.
        </p>
      </section>

      <section className="td-contact-section" style={{ maxWidth: "1200px", margin: "20px auto 60px", padding: "0 20px" }}>
        <DetailedContactForm />
      </section>
    </div>
  );
}
