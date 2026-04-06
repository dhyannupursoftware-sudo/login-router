import { useSeo } from "../hooks/useSeo";

export default function PrivacyPolicy() {
  useSeo({
    title: "Privacy Policy",
    description:
      "Read how Yono Todolist collects, stores, and protects your account and workflow data.",
    path: "/privacy",
  });

  return (
    <main className="todoist-page-wrap">
      <section className="todoist-section">
        <h1>Privacy Policy</h1>
        <p>
          This policy explains how Yono Todolist collects, uses, and protects account and
          workspace data when you use this platform.
        </p>
      </section>

      <section className="todoist-section">
        <h2>1. Information We Collect</h2>
        <ul className="todoist-list">
          <li>Account data such as name, email address, and profile image.</li>
          <li>Task content you create, update, complete, or delete in your workspace.</li>
          <li>Feedback submitted via forms, including rating and message details.</li>
          <li>Basic technical data like browser type and device metadata for diagnostics.</li>
        </ul>
      </section>

      <section className="todoist-section">
        <h2>2. How We Use Your Data</h2>
        <ul className="todoist-list">
          <li>Authenticate users and enforce protected route access.</li>
          <li>Power task workflows, timeline views, and dashboard reporting.</li>
          <li>Respond to support and feedback submissions for product improvement.</li>
          <li>Track usage analytics for performance, reliability, and UX quality.</li>
        </ul>
      </section>

      <section className="todoist-section">
        <h2>3. Data Retention and Security</h2>
        <p>
          Data is retained only as required for service continuity, legal obligations, and account
          operations. Reasonable security controls are applied to reduce unauthorized access risk.
        </p>
      </section>

      <section className="todoist-section">
        <h2>4. Your Rights</h2>
        <ul className="todoist-list">
          <li>Request access to your stored personal data.</li>
          <li>Request correction or deletion of inaccurate personal data.</li>
          <li>Request account removal where technically and legally possible.</li>
        </ul>
      </section>

      <section className="todoist-section">
        <h2>5. Contact</h2>
        <p>
          For privacy requests or questions, contact us at{" "}
          <a href="mailto:pateldhayan041@gmail.com" className="todoist-link">
            pateldhayan041@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
