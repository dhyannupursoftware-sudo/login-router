import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import PrivateRoute from "./routes/PrivateRoute";

interface AuthType {
  token: string | null;
  role: "admin" | "user" | null;
}

export default function App() {
  const [auth, setAuth] = useState<AuthType>({
    token: null,
    role: null,
  });

  //  refresh hone par localStorage se auth load
  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      setAuth(JSON.parse(storedAuth));
    }
  }, []);

  return (
    <Router>
      <Header auth={auth} />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            auth.token ? (
              auth.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/user" />
              )
            ) : (
              <Login setAuth={setAuth} />
            )
          }
        />

        <Route path="/register" element={<Register />} />

        {/* USER PROTECTED */}
        <Route
          path="/user"
          element={
            <PrivateRoute auth={auth} role="user">
              <Home />
            </PrivateRoute>
          }
        />

        {/* ADMIN PROTECTED */}
        <Route
          path="/admin"
          element={
            <PrivateRoute auth={auth} role="admin">
              <Admin />
            </PrivateRoute>
          }
        />
      </Routes>

      <Footer />
    </Router>
  );
}
