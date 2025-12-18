import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
  });

  return (
    <div
      className="p-6 max-w-md mx-auto mt-10 border shadow-lg rounded-xl bg-white"
      style={{
        backgroundColor: "lightblue",
        width: "600px",
        marginLeft: "500px",
        borderRadius: "20px",
        marginTop: "30px",
        padding: "20px",
      }}
    >
      <h2 className="text-2xl font-bold text-center mb-4">Register</h2>

      <input
        type="text"
        placeholder="Full Name"
        value={form.fullname}
        onChange={(e) => setForm({ ...form, fullname: e.target.value })}
        className="w-full p-2 border rounded mb-3"
      />

      <input
        type="email"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full p-2 border rounded mb-3"
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full p-2 border rounded mb-3"
      />

      <button
        style={{
          backgroundColor: "blue",
          width: "200px",
          marginLeft: "180px",
          color: "white",
        }}
        className="p-2 rounded mt-3"
        onClick={() => alert("Registration UI only — No API")}
      >
        Register
      </button>
    </div>
  );
}
