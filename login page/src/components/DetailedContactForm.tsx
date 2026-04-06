import axios from "axios";
import { useState, type FormEvent } from "react";
import { apiClient, apiRoutes } from "../lib/api";
import "../todoist.css";

interface DetailedFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  rating: number;
  subscribe: boolean;
}

interface FormStatus {
  type: "success" | "error" | null;
  text: string;
}

const defaultDetailedFormData: DetailedFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  subject: "",
  category: "general",
  priority: "normal",
  message: "",
  rating: 0,
  subscribe: false,
};

export default function DetailedContactForm() {
  const [formData, setFormData] = useState<DetailedFormData>(defaultDetailedFormData);
  const [status, setStatus] = useState<FormStatus>({ type: null, text: "" });
  const [submitting, setSubmitting] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
      const validationErrors = error.response?.data?.errors;
      if (validationErrors) {
        const firstValidationError = Object.values(validationErrors)[0]?.[0];
        if (firstValidationError) return firstValidationError;
      }

      return error.response?.data?.message || "Message submit failed. Please try again.";
    }

    return "Message submit failed. Please try again.";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.subject.trim() ||
      !formData.message.trim()
    ) {
      setStatus({
        type: "error",
        text: "Please fill in all required fields.",
      });
      return;
    }

    setStatus({ type: null, text: "" });
    setSubmitting(true);

    try {
      await apiClient.post(apiRoutes.contact, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        jobTitle: formData.jobTitle.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        priority: formData.priority,
        message: formData.message.trim(),
        rating: formData.rating,
        subscribe: formData.subscribe,
      });

      setFormData(defaultDetailedFormData);
      setStatus({
        type: "success",
        text: "Thank you. Your message has been sent successfully.",
      });

      setTimeout(() => {
        setStatus({ type: null, text: "" });
      }, 5000);
    } catch (error) {
      setStatus({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "1250px", margin: "0 auto", background: "var(--td-surface)", borderRadius: "24px", overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", border: "1px solid var(--td-border)", boxShadow: "var(--td-shadow)", alignItems: "stretch" }}>
      
      {/* Left Side: Contact Information Cards */}
      <div style={{ padding: "50px 40px", background: "var(--td-surface-soft)", display: "flex", flexDirection: "column", gap: "20px", borderRight: "1px solid var(--td-border)" }}>
        <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--td-text)", marginBottom: "10px" }}>Contact Information</h3>
        <p style={{ color: "var(--td-muted)", fontSize: "1.05rem", marginBottom: "20px", lineHeight: "1.5" }}>Fill out the form and our team will get back to you within 24 hours.</p>

        {/* Email Card */}
        <div style={{ display: "flex", alignItems: "center", padding: "20px", borderRadius: "16px", background: "var(--td-surface)", border: "1px solid var(--td-border)", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "rgba(96, 165, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontSize: "1.6rem", flexShrink: 0 }}>
            <i className="bi bi-envelope-fill" />
          </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--td-text)", fontSize: "1.1rem", marginBottom: "4px" }}>Email Us</div>
            <a href="mailto:pateldhayan041@gmail.com" style={{ color: "var(--td-muted)", textDecoration: "none", fontSize: "1rem" }}>pateldhayan041@gmail.com</a>
          </div>
        </div>

        {/* Phone Card */}
        <div style={{ display: "flex", alignItems: "center", padding: "20px", borderRadius: "16px", background: "var(--td-surface)", border: "1px solid var(--td-border)", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "rgba(96, 165, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontSize: "1.6rem", flexShrink: 0 }}>
            <i className="bi bi-telephone-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--td-text)", fontSize: "1.1rem", marginBottom: "4px" }}>Call Us</div>
            <a href="tel:+1234567890" style={{ color: "var(--td-muted)", textDecoration: "none", fontSize: "1rem" }}>+1 (234) 567-890</a>
          </div>
        </div>

        {/* Location Card */}
        <div style={{ display: "flex", alignItems: "center", padding: "20px", borderRadius: "16px", background: "var(--td-surface)", border: "1px solid var(--td-border)", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "rgba(96, 165, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontSize: "1.6rem", flexShrink: 0 }}>
            <i className="bi bi-geo-alt-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--td-text)", fontSize: "1.1rem", marginBottom: "4px" }}>Headquarters</div>
            <div style={{ color: "var(--td-muted)", fontSize: "1rem", lineHeight: "1.4" }}>San Francisco, CA<br/>United States</div>
          </div>
        </div>

        {/* Business Hours Card */}
        <div style={{ display: "flex", alignItems: "center", padding: "20px", borderRadius: "16px", background: "var(--td-surface)", border: "1px solid var(--td-border)", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "rgba(96, 165, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontSize: "1.6rem", flexShrink: 0 }}>
            <i className="bi bi-clock-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--td-text)", fontSize: "1.1rem", marginBottom: "4px" }}>Business Hours</div>
            <div style={{ color: "var(--td-muted)", fontSize: "1rem", lineHeight: "1.4" }}>Mon-Fri: 9AM - 6PM EST<br/>Sat-Sun: Closed</div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div style={{ padding: "50px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ fontSize: "2rem", color: "var(--td-text)", marginBottom: "30px", fontWeight: "800", letterSpacing: "-0.02em" }}>Send us a message</h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div>
              <label htmlFor="fullName" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>
                Full Name <span style={{color: "var(--td-accent)"}}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                className="todoist-input"
                style={{ width: "100%" }}
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>
                Email Address <span style={{color: "var(--td-accent)"}}>*</span>
              </label>
              <input
                id="email"
                type="email"
                className="todoist-input"
                style={{ width: "100%" }}
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div>
              <label htmlFor="phone" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>Phone Number</label>
              <input
                id="phone"
                type="tel"
                className="todoist-input"
                style={{ width: "100%" }}
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="company" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>Company</label>
              <input
                id="company"
                type="text"
                className="todoist-input"
                style={{ width: "100%" }}
                placeholder="Your Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="jobTitle" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>Job Title</label>
            <input
              id="jobTitle"
              type="text"
              className="todoist-input"
              style={{ width: "100%" }}
              placeholder="Product Manager"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div>
              <label htmlFor="category" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>
                Category <span style={{color: "var(--td-accent)"}}>*</span>
              </label>
              <select
                id="category"
                className="todoist-input"
                style={{ width: "100%" }}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="general">General Inquiry</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="partnership">Partnership</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>Priority</label>
              <select
                id="priority"
                className="todoist-input"
                style={{ width: "100%" }}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="subject" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>
              Subject <span style={{color: "var(--td-accent)"}}>*</span>
            </label>
            <input
              id="subject"
              type="text"
              className="todoist-input"
              style={{ width: "100%" }}
              placeholder="How can we help?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="message" style={{ display: "block", fontSize: "0.9rem", color: "var(--td-muted)", marginBottom: "8px", fontWeight: "600" }}>
              Message <span style={{color: "var(--td-accent)"}}>*</span>
            </label>
            <textarea
              id="message"
              className="todoist-textarea"
              style={{ width: "100%", minHeight: "150px", resize: "vertical" }}
              placeholder="Tell us your thoughts, feedback, questions, or requirements..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", marginTop: "5px" }}>
            <input
              type="checkbox"
              style={{ width: "18px", height: "18px", accentColor: "var(--td-accent)", cursor: "pointer" }}
              checked={formData.subscribe}
              onChange={(e) => setFormData({ ...formData, subscribe: e.target.checked })}
            />
            <span style={{ fontSize: "0.95rem", color: "var(--td-text)" }}>Subscribe to our newsletter for updates and tips</span>
          </label>

          {status.text ? (
            <p
              style={{
                padding: "14px",
                borderRadius: "10px",
                fontSize: "0.95rem",
                background:
                  status.type === "success"
                    ? "rgba(74, 222, 128, 0.15)"
                    : "rgba(248, 113, 113, 0.15)",
                color: status.type === "success" ? "#4ade80" : "#f87171",
                border: `1px solid ${status.type === "success" ? "#4ade80" : "#f87171"}`,
              }}
            >
              {status.text}
            </p>
          ) : null}

          <button
            type="submit"
            className="todoist-btn-primary"
            style={{ width: "100%", padding: "16px", fontSize: "1.1rem", fontWeight: "bold", borderRadius: "12px", marginTop: "10px" }}
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
