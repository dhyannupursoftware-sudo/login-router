import { useState } from "react";
import { Link } from "react-router-dom";

import heroImg from "../assets/hero_dashboard.png";
import taskCreationImg from "../assets/task_creation.png";
import taskManagementImg from "../assets/task_management.png";
import templateAccountingImg from "../assets/template_accounting.png";
import templateTravelImg from "../assets/template_travel.png";
import templateClientImg from "../assets/template_client.png";
import templateDeepworkImg from "../assets/template_deepwork.png";
import templateMeetingImg from "../assets/template_meeting.png";
import personalGroceryImg from "../assets/personal_grocery.png";
import personalWorkoutImg from "../assets/personal_workout.png";
import personalReadingImg from "../assets/personal_reading.png";
import eduScheduleImg from "../assets/edu_schedule.png";
import eduExamImg from "../assets/edu_exam.png";
import { useSeo } from "../hooks/useSeo";
import "../todoist.css";

const features = [
  {
    icon: "bi bi-lightning-charge-fill",
    title: "Smart Task Management",
    text: "Capture, organize, and prioritize tasks instantly.",
  },
  {
    icon: "bi bi-people-fill",
    title: "Team Collaboration",
    text: "Keep teams aligned across projects and milestones.",
  },
  {
    icon: "bi bi-graph-up-arrow",
    title: "Performance Analytics",
    text: "Monitor completion and improve execution consistency.",
  },
  {
    icon: "bi bi-bell-fill",
    title: "Smart Notifications",
    text: "Get alerts right when they matter most.",
  },
  {
    icon: "bi bi-cloud-check-fill",
    title: "Cloud Sync",
    text: "Access your data from desktop and mobile.",
  },
  {
    icon: "bi bi-shield-lock-fill",
    title: "Secure Data",
    text: "Enterprise-grade security and compliance.",
  },
];

const stats = [
  { icon: "bi bi-people-fill", label: "Total users", value: "2.4M+", note: "Professionals every month" },
  { icon: "bi bi-check2-square", label: "Tasks completed", value: "148M+", note: "Tracked across workspaces" },
  { icon: "bi bi-diagram-3-fill", label: "Active teams", value: "96K+", note: "Delivering with shared plans" },
  { icon: "bi bi-emoji-smile-fill", label: "Satisfaction", value: "98.7%", note: "Users reporting improved confidence" },
];

const heroPreviewMetrics = [
  { label: "Tasks today", value: "24" },
  { label: "Completed", value: "18" },
  { label: "Focus score", value: "92%" },
];

const heroWorkflow = [
  "Plan work with deadlines, owners, and clean priorities.",
  "Track real-time progress without switching between tools.",
  "Share updates instantly with your team from one workspace.",
];

const integrations = [
  { icon: "bi bi-chat-dots-fill", label: "Slack" },
  { icon: "bi bi-github", label: "GitHub" },
  { icon: "bi bi-cloud-check-fill", label: "Google Suite" },
  { icon: "bi bi-people-fill", label: "Microsoft Teams" },
  { icon: "bi bi-camera-video-fill", label: "Zoom" },
  { icon: "bi bi-palette-fill", label: "Figma" },
];

export default function Home() {
  useSeo({
    title: "Home",
    description:
      "Yono Todolist helps teams plan, execute, and report work with one structured task workspace.",
    path: "/",
  });

  const [activeTemplateTab, setActiveTemplateTab] = useState("Work");

  const templateTabs = ["Work", "Personal", "Education", "Management", "Marketing & Sales", "Customer Support"];

  const allTemplatesData: Record<
    string,
    { title: string; desc: string; image: string; iconBg: string }[]
  > = {
    Work: [
      {
        title: "Accounting Tasks",
        desc: "Create a system to keep your books, receipts, and invoices organized.",
        image: templateAccountingImg,
        iconBg: "#fdf6ed",
      },
      {
        title: "Business Travel Packing",
        desc: "Never forget your laptop charger, lucky shoes, or passport again.",
        image: templateTravelImg,
        iconBg: "#fbf6ec",
      },
      {
        title: "Client Management",
        desc: "Organize your work with clients from the smallest to largest details.",
        image: templateClientImg,
        iconBg: "#fdf4ef",
      },
      {
        title: "Deep Work",
        desc: "Practice prioritizing focus and eliminating distraction with this template.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
      {
        title: "Meeting Agenda",
        desc: "Waste less time in meetings, ensuring they're efficient and action-oriented.",
        image: templateMeetingImg,
        iconBg: "#fef5f4",
      },
    ],
    Personal: [
      {
        title: "Grocery Shopping",
        desc: "A smart list to keep your weekly groceries organized and within budget.",
        image: personalGroceryImg,
        iconBg: "#eff6ff",
      },
      {
        title: "Workout Routine",
        desc: "Track your fitness progress, sets, reps, and weekly schedule.",
        image: personalWorkoutImg,
        iconBg: "#fdf4ff",
      },
      {
        title: "Reading List",
        desc: "Keep track of books you want to read, are reading, or have finished.",
        image: personalReadingImg,
        iconBg: "#f0fdfa",
      },
      {
        title: "Travel Packing",
        desc: "Never forget your passport, chargers, and essentials again.",
        image: templateTravelImg,
        iconBg: "#fbf6ec",
      },
      {
        title: "Focus Time",
        desc: "Practice prioritizing focus and eliminating distraction at home.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
    ],
    Education: [
      {
        title: "Class Schedule",
        desc: "Never miss a lecture with a clear weekly overview of your classes.",
        image: eduScheduleImg,
        iconBg: "#fefce8",
      },
      {
        title: "Exam Preparation",
        desc: "Plan your study sessions and track syllabus completion.",
        image: eduExamImg,
        iconBg: "#fef2f2",
      },
      {
        title: "Study Group",
        desc: "Waste less time in meetings, ensuring they're efficient and action-oriented.",
        image: templateMeetingImg,
        iconBg: "#fef5f4",
      },
      {
        title: "Reading Assignments",
        desc: "Keep track of textbooks you want to read, or have finished.",
        image: personalReadingImg,
        iconBg: "#f0fdfa",
      },
      {
        title: "Deep Focus",
        desc: "Practice prioritizing focus and eliminating distraction for assignments.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
    ],
    Management: [
      {
        title: "Project Workflow",
        desc: "Organize your team's tasks and deliver projects on time efficiently.",
        image: templateAccountingImg,
        iconBg: "#fdf6ed",
      },
      {
        title: "Client Relations",
        desc: "Organize your work with clients from the smallest to largest details.",
        image: templateClientImg,
        iconBg: "#fdf4ef",
      },
      {
        title: "Performance Review",
        desc: "A smart system to keep track of team output and metrics organized.",
        image: eduExamImg,
        iconBg: "#fef2f2",
      },
      {
        title: "Meeting Agendas",
        desc: "Waste less time in meetings, ensuring they're efficient and action-oriented.",
        image: templateMeetingImg,
        iconBg: "#fef5f4",
      },
      {
        title: "Strategic Focus",
        desc: "Practice prioritizing focus and eliminating distraction for deep work.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
    ],
    "Marketing & Sales": [
      {
        title: "Lead Generation",
        desc: "Organize your workflow to gather details correctly every single time.",
        image: templateClientImg,
        iconBg: "#fdf4ef",
      },
      {
        title: "Campaign Planning",
        desc: "Never miss a step while coordinating your key marketing campaigns.",
        image: eduScheduleImg,
        iconBg: "#fefce8",
      },
      {
        title: "Sales Meetings",
        desc: "Waste less time in meetings, ensuring they're efficient and action-oriented.",
        image: templateMeetingImg,
        iconBg: "#fef5f4",
      },
      {
        title: "Performance Metrics",
        desc: "Create a system to keep your quarterly targets and KPIs organized.",
        image: eduExamImg,
        iconBg: "#fef2f2",
      },
      {
        title: "Deep Brainstorming",
        desc: "Practice prioritizing focus and eliminating distraction during ideation.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
    ],
    "Customer Support": [
      {
        title: "Ticket Management",
        desc: "Create a reliable ongoing system to keep track of user queries organized.",
        image: personalReadingImg,
        iconBg: "#f0fdfa",
      },
      {
        title: "Client Handover",
        desc: "Organize your work spanning customers from smallest to the largest details.",
        image: templateClientImg,
        iconBg: "#fdf4ef",
      },
      {
        title: "Team Shift Schedule",
        desc: "Never miss a shift handover with a clear weekly overview mapped carefully.",
        image: eduScheduleImg,
        iconBg: "#fefce8",
      },
      {
        title: "Support Reviews",
        desc: "Track satisfaction feedback, issues, and monitor your success consistently.",
        image: eduExamImg,
        iconBg: "#fef2f2",
      },
      {
        title: "Deep Problem Solving",
        desc: "Practice prioritizing focus and eliminating distraction over tough tickets.",
        image: templateDeepworkImg,
        iconBg: "#fdf3f1",
      },
    ],
  };

  const templatesData = allTemplatesData[activeTemplateTab] || allTemplatesData.Work;
  return (
    <div className="todoist-page-wrap">
      <section className="td-feature-split" style={{ paddingTop: "80px", paddingBottom: "60px" }}>
        <div className="td-feature-content">
          <h1
            style={{
              fontSize: "clamp(3rem, 5vw, 4.5rem)",
              fontWeight: 800,
              fontFamily: "var(--td-font-heading)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--td-text)",
              marginBottom: "24px",
            }}
          >
            Organize your work and life, finally.
          </h1>
          <p
            style={{
              fontSize: "clamp(1.15rem, 2vw, 1.35rem)",
              color: "var(--td-muted)",
              lineHeight: 1.5,
              marginBottom: "40px",
            }}
          >
            Become focused, organized, and calm with Yono Todolist. The world's #1 task manager and
            to-do list app.
          </p>
          <div className="td-hero-btns">
            <Link to="/register" className="td-btn-primary">
              Start for free
            </Link>
            <Link to="/about" className="td-btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
        <div className="td-feature-media">
          <img
            src={heroImg}
            alt="Yono Task Interface"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "18px",
              boxShadow: "var(--td-shadow)",
              border: "1px solid var(--td-border)",
            }}
          />
        </div>
      </section>

      <section className="td-trust-section">
        <h3>30 million+ people and teams trust their sanity to Yono</h3>
        <div className="td-logos">
          <i className="bi bi-microsoft" />
          <i className="bi bi-amazon" />
          <i className="bi bi-google" />
          <i className="bi bi-meta" />
          <i className="bi bi-apple" />
          <i className="bi bi-stripe" />
        </div>
      </section>

      <section className="td-press-quotes-section">
        <div className="td-press-quotes-decor">
          <svg className="td-press-sparkle left" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0L13.1 7.4C13.5 10.3 15.7 12.5 18.6 13.1L24 14L18.6 14.9C15.7 15.5 13.5 17.7 13.1 20.6L12 28L10.9 20.6C10.5 17.7 8.3 15.5 5.4 14.9L0 14L5.4 13.1C8.3 12.5 10.5 10.3 10.9 7.4L12 0Z" fill="#FBBF24"/>
          </svg>
          <svg className="td-press-sparkle right" width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0L13.1 7.4C13.5 10.3 15.7 12.5 18.6 13.1L24 14L18.6 14.9C15.7 15.5 13.5 17.7 13.1 20.6L12 28L10.9 20.6C10.5 17.7 8.3 15.5 5.4 14.9L0 14L5.4 13.1C8.3 12.5 10.5 10.3 10.9 7.4L12 0Z" fill="#FBBF24"/>
          </svg>
          <div className="td-press-wave">
            <svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 60C320 160 420 180 720 100C1020 20 1120 40 1440 100V105C1120 45 1020 25 720 105C420 185 320 165 0 65V60Z" fill="rgba(255, 255, 255, 0.04)" />
              <path d="M0 80C280 180 480 170 720 110C960 50 1160 20 1440 80V82C1160 22 960 52 720 112C480 172 280 182 0 82V80Z" fill="rgba(52, 211, 153, 0.05)" />
            </svg>
          </div>
        </div>

        <div className="td-press-quotes-inner">
          <div className="td-press-quote-card">
            <p>"Simple, straightforward, and super powerful"</p>
            <div className="td-press-logo verge">THE VERGE</div>
          </div>
          <div className="td-press-divider" />
          <div className="td-press-quote-card">
            <p>"The best to-do list app on the market"</p>
            <div className="td-press-logo pcmag">
              <span>PC</span><br/>MAG
            </div>
          </div>
          <div className="td-press-divider" />
          <div className="td-press-quote-card">
            <p>"Nothing short of stellar"</p>
            <div className="td-press-logo techradar">
              techradar <i className="bi bi-wifi" style={{ transform: "rotate(45deg)", display: "inline-block" }}></i>
            </div>
          </div>
        </div>
      </section>

      <section className="td-feature-split">
        <div className="td-feature-content">
          <span className="td-feature-tag">Clear your mind</span>
          <h2 className="td-feature-title">The fastest way to get tasks out of your head.</h2>
          <p className="td-feature-desc">
            Type just about anything into the task field and Yono's one-of-a-kind natural language
            recognition will instantly fill your to-do list.
          </p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "20px" }}>
            {heroWorkflow.map((item, index) => (
              <li
                key={index}
                style={{
                  color: "var(--td-muted)",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <i className="bi bi-check-circle-fill" style={{ color: "var(--td-accent)" }} /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="td-feature-media">
          <img src={taskCreationImg} alt="Task creation input" />
        </div>
      </section>

      <section className="td-feature-split reverse">
        <div className="td-feature-content">
          <span className="td-feature-tag">Focus on what's important</span>
          <h2 className="td-feature-title">Reach that mental clarity you've been longing for.</h2>
          <p className="td-feature-desc">
            Your to-do lists are automatically sorted into Today, Upcoming, and custom Filter views to
            help you prioritize your most important work.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {heroPreviewMetrics.map((item, index) => (
              <div key={index}>
                <strong style={{ fontSize: "1.5rem", color: "var(--td-accent)" }}>{item.value}</strong>
                <p style={{ margin: 0, color: "var(--td-muted)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="td-feature-media">
          <img src={taskManagementImg} alt="Task management lists" />
        </div>
      </section>

      <section className="td-templates-section">
        <div className="td-templates-tabs">
          {templateTabs.map((tab) => (
            <button
              key={tab}
              className={`td-template-tab ${activeTemplateTab === tab ? "active" : ""}`}
              onClick={() => setActiveTemplateTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="td-templates-grid">
          {templatesData.map((template, idx) => (
            <div key={idx} className="td-template-card">
              <div
                className="td-template-img-holder"
                style={{ backgroundColor: template.iconBg || "#f8f9fa" }}
              >
                <img src={template.image} alt={template.title} />
              </div>
              <div className="td-template-content">
                <h4>{template.title}</h4>
                <p>{template.desc}</p>
                <div className="td-template-footer">
                  <i className="bi bi-card-list" style={{ fontSize: "1.2rem", color: "var(--td-accent)" }} /> List
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link to="/register" className="td-templates-link">
          See more templates <i className="bi bi-chevron-right" style={{ fontSize: "0.8rem", marginTop: "2px" }} />
        </Link>
      </section>

      <section className="td-trust-section" style={{ backgroundColor: "transparent", padding: "80px 20px" }}>
        <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "50px" }}>
          Discover all features
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "40px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {features.map((feature, idx) => (
            <div key={idx} style={{ textAlign: "left" }}>
              <i
                className={feature.icon}
                style={{
                  fontSize: "2rem",
                  color: "var(--td-accent)",
                  marginBottom: "10px",
                  display: "inline-block",
                }}
              />
              <h4 style={{ fontSize: "1.25rem", margin: "10px 0", fontWeight: "bold" }}>{feature.title}</h4>
              <p style={{ color: "var(--td-muted)" }}>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="td-extension">
        <h2 className="td-feature-title" style={{ textAlign: "center", marginBottom: "40px" }}>
          A productivity powerhouse
        </h2>
        <div className="td-logos" style={{ opacity: 1, gap: "80px" }}>
          {stats.map((stat, idx) => (
            <div key={idx}>
              <h1 style={{ color: "var(--td-accent)", fontSize: "3.5rem", marginBottom: "10px" }}>{stat.value}</h1>
              <p style={{ color: "var(--td-text)", fontWeight: "700", marginBottom: "5px" }}>{stat.label}</p>
              <p style={{ color: "var(--td-muted)", fontSize: "0.9rem" }}>{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="td-trust-section" style={{ backgroundColor: "transparent" }}>
        <h2 className="td-feature-title" style={{ marginBottom: "20px" }}>
          Connect with your tools
        </h2>
        <p className="td-feature-desc" style={{ marginBottom: "40px" }}>
          Works dynamically with the stack you already use.
        </p>
        <div className="td-logos" style={{ opacity: 1 }}>
          {integrations.map((integration, idx) => (
            <div
              key={idx}
              style={{
                padding: "20px",
                border: "1px solid var(--td-border)",
                borderRadius: "var(--td-radius-md)",
                minWidth: "150px",
              }}
            >
              <i
                className={integration.icon}
                style={{ fontSize: "2.5rem", color: "var(--td-text)", marginBottom: "10px" }}
              />
              <p style={{ fontWeight: 600, margin: 0 }}>{integration.label}</p>
            </div>
          ))}
        </div>
      </section>



      <section className="td-cta-bottom">
        <h2 className="td-feature-title" style={{ fontSize: "3rem" }}>
          Gain back control of your time
        </h2>
        <p className="td-feature-desc" style={{ marginBottom: "30px" }}>
          Join millions of people who organize work and life with Yono Todolist.
        </p>
        <Link to="/register" className="td-btn-primary">
          Start for free
        </Link>
      </section>
    </div>
  );
}
