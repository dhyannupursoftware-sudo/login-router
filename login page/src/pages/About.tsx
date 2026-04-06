import { Link } from "react-router-dom";
import { useSeo } from "../hooks/useSeo";
import "../todoist.css";
import aboutHeroImg from "../assets/about_hero.png";
import aboutStoryImg from "../assets/about_story.png";

const featureHighlights = [
  {
    icon: "bi bi-bullseye",
    title: "Focus-First Interface",
    text: "Large layouts, clear hierarchy, and distraction-free workflows that keep attention on what matters most.",
  },
  {
    icon: "bi bi-shield-check",
    title: "Reliable Execution",
    text: "Priority, due dates, and status tracking work together so teams always know what is blocked, pending, or done.",
  },
  {
    icon: "bi bi-graph-up-arrow",
    title: "Progress Intelligence",
    text: "Live metrics and dashboard views make it easy to measure planning quality and delivery consistency.",
  },
  {
    icon: "bi bi-people-fill",
    title: "Built for Team Alignment",
    text: "Personal and collaborative workflows stay organized in one scalable environment.",
  },
];

const teamCards = [
  {
    name: "Dhyan Patel",
    role: "Founder & Product Lead",
    bio: "Defines product strategy and user experience direction with a focus on clarity and execution speed.",
  },
  {
    name: "Aarav Mehta",
    role: "Engineering Lead",
    bio: "Builds robust architecture and high-performance interaction systems for daily task operations.",
  },
  {
    name: "Riya Sharma",
    role: "Design Director",
    bio: "Shapes visual language, premium UI patterns, and interaction details across every product touchpoint.",
  },
  {
    name: "Kabir Shah",
    role: "Customer Success",
    bio: "Works with users to improve workflows, onboarding quality, and long-term productivity outcomes.",
  },
];

const statistics = [
  { value: "500K+", label: "Active Users", icon: "bi bi-people" },
  { value: "14.2M", label: "Tasks Completed", icon: "bi bi-check2-all" },
  { value: "120+", label: "Countries", icon: "bi bi-globe" },
  { value: "99.9%", label: "Uptime", icon: "bi bi-activity" },
];

const milestones = [
  { year: "2020", title: "The Beginning", description: "Yono Todolist was founded with a single mission: to simplify productivity." },
  { year: "2022", title: "Series A", description: "Raised our first round of funding to expand the engineering and design teams." },
  { year: "2024", title: "Global Scale", description: "Launched multi-language support and crossed 100K active daily users." },
  { year: "2026", title: "Enterprise Ready", description: "Introduced advanced collaboration, AI assistants, and security features." },
];

const openPositions = [
  { role: "Senior Frontend Engineer", dept: "Engineering", location: "Remote" },
  { role: "Product Designer", dept: "Design", location: "San Francisco, CA" },
  { role: "Customer Success Manager", dept: "Support", location: "Remote" },
  { role: "Marketing Specialist", dept: "Growth", location: "New York, NY" },
];

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export default function About() {
  useSeo({
    title: "About",
    description:
      "Learn about Yono Todolist mission, story, and premium productivity platform design principles.",
    path: "/about",
  });

  return (
    <div className="todoist-page-wrap">
      {/* Hero Section */}
      <section className="td-feature-split" style={{ paddingTop: "80px", paddingBottom: "60px" }}>
        <div className="td-feature-content">
          <p style={{ color: "var(--td-accent)", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>About Yono Todolist</p>
          <h1 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 800, fontFamily: "var(--td-font-heading)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--td-text)", marginBottom: "24px" }}>
            Built for Focused Minds.
          </h1>
          <p style={{ fontSize: "clamp(1.15rem, 2vw, 1.35rem)", color: "var(--td-muted)", lineHeight: 1.5, marginBottom: "40px" }}>
            Yono Todolist is a premium SaaS productivity platform designed for people who care about
            clarity, consistency, and high-quality execution.
          </p>
          <div className="td-hero-btns">
            <Link to="/register" className="td-btn-primary">
              Join our mission
            </Link>
            <a href="#story" className="td-btn-secondary">
              Read our story
            </a>
          </div>
        </div>
        <div className="td-feature-media">
          <img
            src={aboutHeroImg}
            alt="Focused team planning together"
            style={{ width: "100%", height: "auto", borderRadius: "18px", boxShadow: "var(--td-shadow)", border: "1px solid var(--td-border)" }}
          />
        </div>
      </section>

      {/* Feature Split 1 - Story */}
      <section id="story" className="td-feature-split reverse">
        <div className="td-feature-content">
          <span className="td-feature-tag">Our Story</span>
          <h2 className="td-feature-title">From chaos to clarity.</h2>
          <p className="td-feature-desc" style={{ marginBottom: "20px" }}>
            Yono Todolist started from a simple problem: too many tools, too much noise, and not enough clarity. We built a premium task platform that combines structure, speed, and confidence in one place.
          </p>
          <p className="td-feature-desc">
            We believe productivity is not about doing more random work. It is about making the
            right work visible, manageable, and actionable with confidence.
          </p>
        </div>
        <div className="td-feature-media">
          <img
            src={aboutStoryImg}
            alt="Our journey"
          />
        </div>
      </section>

      {/* Values / Highlights Grid */}
      <section className="td-trust-section" style={{ backgroundColor: "transparent", padding: "80px 20px" }}>
         <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "20px" }}>What makes us different</h2>
         <p className="td-feature-desc" style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
            Designed with enterprise-level rigor and startup-level speed, the product balances beauty, usability, and operational reliability.
         </p>
         <div className="td-about-highlight-grid">
            {featureHighlights.map((feature, idx) => (
               <div key={idx} className="td-about-highlight-card">
                  <i className={feature.icon} style={{ fontSize: "2rem", color: "var(--td-accent)", marginBottom: "15px", display: "inline-block" }}></i>
                  <h4 style={{ fontSize: "1.25rem", margin: "10px 0", fontWeight: "bold", color: "var(--td-text)" }}>{feature.title}</h4>
                  <p style={{ color: "var(--td-muted)" }}>{feature.text}</p>
               </div>
            ))}
         </div>
      </section>

      {/* Team Grid */}
      <section className="td-trust-section" style={{ padding: "80px 20px", backgroundColor: "transparent" }}>
        <span className="td-feature-tag" style={{ textAlign: "center", display: "block" }}>Leadership</span>
        <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "20px" }}>Team behind the product</h2>
        <p className="td-feature-desc" style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
          A focused cross-functional team combining product strategy, design excellence, and engineering precision.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "30px", maxWidth: "1200px", margin: "0 auto" }}>
          {teamCards.map((member) => (
            <div key={member.name} style={{ textAlign: "center", padding: "30px", background: "var(--td-surface-soft)", borderRadius: "var(--td-radius-lg)", border: "1px solid var(--td-border)" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "var(--td-surface)",
                  color: "var(--td-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                  margin: "0 auto 20px",
                  border: "2px solid var(--td-accent)"
                }}
              >
                {getInitials(member.name)}
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "5px", color: "var(--td-text)" }}>{member.name}</h3>
              <p style={{ color: "var(--td-accent)", fontWeight: "600", fontSize: "0.9rem", marginBottom: "15px" }}>{member.role}</p>
              <p style={{ color: "var(--td-muted)", fontSize: "0.95rem" }}>{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistics Section */}
      <section className="td-trust-section" style={{ padding: "80px 20px" }}>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "30px", maxWidth: "1200px", margin: "0 auto" }}>
            {statistics.map((stat, idx) => (
               <div key={idx} className="td-stat-card">
                  <i className={`${stat.icon} td-stat-icon`}></i>
                  <h3 className="td-stat-value">{stat.value}</h3>
                  <p className="td-stat-label">{stat.label}</p>
               </div>
            ))}
         </div>
      </section>

      {/* Timeline / Milestones */}
      <section className="td-trust-section" style={{ padding: "80px 20px" }}>
        <span className="td-feature-tag" style={{ textAlign: "center", display: "block" }}>Our Journey</span>
        <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "50px" }}>Milestones that define us</h2>
        
        <div className="td-timeline">
          {milestones.map((ms, idx) => (
             <div key={idx} className="td-timeline-item">
                <div className="td-timeline-year">{ms.year}</div>
                <div className="td-timeline-title">{ms.title}</div>
                <div className="td-timeline-desc">{ms.description}</div>
             </div>
          ))}
        </div>
      </section>

      {/* Careers / Open Positions */}
      <section className="td-trust-section" style={{ paddingTop: "100px", paddingBottom: "0px", paddingLeft: "20px", paddingRight: "20px", background: "linear-gradient(180deg, transparent, var(--td-surface-soft))" }}>
        <span className="td-feature-tag" style={{ textAlign: "center", display: "block" }}>Careers</span>
        <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "20px" }}>Join our growing team</h2>
        <p className="td-feature-desc" style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
          We are always looking for passionate people. See our current open roles below.
        </p>
         <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {openPositions.map((job, idx) => (
             <div key={idx} className="td-job-card">
                <div style={{ textAlign: "left" }}>
                   <h4 style={{ fontSize: "1.25rem", margin: "0 0 8px 0", color: "var(--td-text)" }}>{job.role}</h4>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", color: "var(--td-muted)", fontSize: "0.95rem" }}>
                      <span><i className="bi bi-briefcase" style={{ marginRight: "6px" }}></i>{job.dept}</span>
                      <span><i className="bi bi-geo-alt" style={{ marginRight: "6px" }}></i>{job.location}</span>
                   </div>
                </div>
                <div>
                   <button className="td-btn-secondary" style={{ padding: "8px 24px" }}>Apply</button>
                </div>
             </div>
          ))}
        </div>

        {/* Combined Final CTA */}
        <div className="td-cta-bottom" style={{ paddingBottom: "20px", paddingTop: "120px" }}>
          <h2 className="td-feature-title" style={{ fontSize: "3rem" }}>
            Ready to change the way you work?
          </h2>
          <p className="td-feature-desc" style={{ marginBottom: "30px" }}>
            Join us and millions of others who organize their life with Yono Todolist.
          </p>
          <Link to="/register" className="td-btn-primary">
            Start for free
          </Link>
        </div>
      </section>
    </div>
  );
}
