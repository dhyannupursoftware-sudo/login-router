import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AuthType {
  token: string | null;
  role: "admin" | "user" | null;
}

interface LoginProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthType>>;
}

export default function Login({ setAuth }: LoginProps) {
  const [user, setUser] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const loginUser = () => {
    if (user.username === "admin" && user.password === "admin") {
      const authData: AuthType = { token: "ADMIN_TOKEN", role: "admin" };
      localStorage.setItem("auth", JSON.stringify(authData));
      setAuth(authData);
      navigate("/admin");
    } else if (user.username === "user" && user.password === "user") {
      const authData: AuthType = { token: "USER_TOKEN", role: "user" };
      localStorage.setItem("auth", JSON.stringify(authData));
      setAuth(authData);
      navigate("/user");
    } else {
      alert("Invalid Login!");
    }
  };

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
          Welcome Back
        </h2>
        <p style={{ marginBottom: "20px", color: "#64748b", fontSize: "14px" }}>
          Login to continue
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
          placeholder="Username"
          value={user.username}
          onChange={(e) => setUser({ ...user, username: e.target.value })}
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
          value={user.password}
          onChange={(e) => setUser({ ...user, password: e.target.value })}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "600",
          }}
          onClick={loginUser}
        >
          Login
        </button>
      </div>
    </div>
  );
}
