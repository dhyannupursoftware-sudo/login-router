import { useSeo } from "../hooks/useSeo";

export default function TermsAndConditions() {
  useSeo({
    title: "Terms and Conditions",
    description:
      "Review usage terms, responsibilities, and acceptable use policies for Yono Todolist.",
    path: "/terms",
  });

  return (
    <main className="todoist-page-wrap">
      <section className="todoist-section">
        <h1>Terms and Conditions</h1>
        <p>
          By using Yono Todolist, you agree to these terms. If you disagree, stop using the
          website and related workspace services.
        </p>
      </section>

      <section className="todoist-section">
        <h2>1. Account Responsibility</h2>
        <ul className="todoist-list">
          <li>You are responsible for maintaining confidentiality of your login credentials.</li>
          <li>You are responsible for actions performed under your authenticated account.</li>
          <li>Provide accurate account information and keep it updated.</li>
        </ul>
      </section>

      <section className="todoist-section">
        <h2>2. Acceptable Use</h2>
        <ul className="todoist-list">
          <li>Do not misuse APIs, abuse limits, or attempt unauthorized access.</li>
          <li>Do not upload harmful, malicious, or unlawful content in workspace fields.</li>
          <li>Do not use this platform for fraudulent or prohibited activities.</li>
        </ul>
      </section>

      <section className="todoist-section">
        <h2>3. Service Availability</h2>
        <p>
          We may update, modify, or temporarily suspend features for maintenance, security
          hardening, and product upgrades.
        </p>
      </section>

      <section className="todoist-section">
        <h2>4. Limitation of Liability</h2>
        <p>
          Yono Todolist is provided on an "as available" basis. We are not liable for indirect
          damages, productivity loss, or business impact resulting from downtime or technical
          issues, to the extent permitted by law.
        </p>
      </section>

      <section className="todoist-section">
        <h2>5. Contact</h2>
        <p>
          For terms-related questions, write to{" "}
          <a href="mailto:pateldhayan041@gmail.com" className="todoist-link">
            pateldhayan041@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
