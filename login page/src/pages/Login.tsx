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
      const authData: AuthType = {
        token: "ADMIN_TOKEN",
        role: "admin",
      };
       /* store auth in localstorage */
      localStorage.setItem("auth", JSON.stringify(authData));
      setAuth(authData);
      navigate("/admin");
    } 
    else if (user.username === "user" && user.password === "user") {
      const authData: AuthType = {
        token: "USER_TOKEN",
        role: "user",
      };

      localStorage.setItem("auth", JSON.stringify(authData));
      setAuth(authData);
      navigate("/user");
    } 
    else {
      alert("Invalid Login!");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "lightblue",
        width: "600px",
        margin: "40px auto",
        borderRadius: "20px",
        height: "300px",
        padding: "20px",
      }}
    >
      <h2 style={{ textAlign: "center", fontSize: "28px" }}>LOGIN</h2>

      <input
        style={{ width: "400px", margin: "20px auto", display: "block" }}
        type="text"
        placeholder="Username"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
      />

      <input
        style={{ width: "400px", margin: "10px auto", display: "block" }}
        type="password"
        placeholder="Password"
        value={user.password}
        onChange={(e) => setUser({ ...user, password: e.target.value })}
      />

      <button
        style={{
          backgroundColor: "blue",
          color: "white",
          width: "200px",
          margin: "20px auto",
          display: "block",
          padding: "10px",
        }}
        onClick={loginUser}
      >
        Login
      </button>
    </div>
  );
}
