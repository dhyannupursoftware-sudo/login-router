import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
  });

  return (
    <div
      style={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
      }}
    >
      <div
        style={{
          background: "white",
          width: "380px",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "6px", color: "#0f172a" }}>
          Create Account
        </h2>
        <p style={{ marginBottom: "20px", color: "#64748b", fontSize: "14px" }}>
          Register to get started
        </p>

        <input
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "14px",
            borderRadius: "8px",
            border: "1px solid #cbd5f5",
            fontSize: "15px",
            outline: "none",
          }}
          type="text"
          placeholder="Full Name"
          value={form.fullname}
          onChange={(e) => setForm({ ...form, fullname: e.target.value })}
        />

        <input
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "14px",
            borderRadius: "8px",
            border: "1px solid #cbd5f5",
            fontSize: "15px",
            outline: "none",
          }}
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "18px",
            borderRadius: "8px",
            border: "1px solid #cbd5f5",
            fontSize: "15px",
            outline: "none",
          }}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "600",
          }}
          onClick={() => alert("Registration UI only — No API")}
        >
          Register
        </button>
      </div>
    </div>
  );
}
