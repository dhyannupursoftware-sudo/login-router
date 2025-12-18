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
    if (user.username === "admin" && user.password === "admin123") {
      setAuth({ token: "ADMIN_TOKEN", role: "admin" });
      navigate("/admin");
    } 
    else if (user.username === "user" && user.password === "user123") {
      setAuth({ token: "USER_TOKEN", role: "user" });
      navigate("/home");
    }
    else {
      alert("Invalid Login!");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 shadow-lg border rounded-xl bg-white"
             style={{backgroundColor:"lightblue",
          width:"600px",
          marginLeft:"500px",
          borderRadius:"20px",
          marginTop:"30px",
          height:"300px",
          }}>
      <h2 className="text-2xl font-bold text-center mb-4"
      style={{
           
            width:"400px",
            marginLeft:"250px",
            padding:"30px"}}>LOGIN</h2>

      <input  
         style={{backgroundColor:"white",
          width:"400px",
          marginLeft:"100px",}}
        className="w-full p-2 border rounded mb-3"
        type="text"

        placeholder="Username"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
      />

      <input style={{
            backgroundColor:"white",
            width:"400px",
            marginLeft:"100px",}}
          className="w-full p-2 border rounded mb-3"
        type="password"
        placeholder="Password"
        value={user.password}
        onChange={(e) => setUser({ ...user, password: e.target.value })}
      />

      <button  style=  {{backgroundColor:"blue",
          width:"200px",
          marginLeft:"200px",}}
        onClick={loginUser}
        className="w-full bg-blue-700 text-white p-2 rounded mt-3"
      >
        Login
      </button>
    </div>
  );
}
