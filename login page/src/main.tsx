import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

/* 🔥 Bootstrap CSS */
import "bootstrap/dist/css/bootstrap.min.css";

/* 🔥 Bootstrap Icons (optional but recommended) */
import "bootstrap-icons/font/bootstrap-icons.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);