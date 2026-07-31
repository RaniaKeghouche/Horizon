import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./lib/i18n"; // initialise i18n (Arabic RTL first) before rendering
import "./styles/global.css";
import { initOutbox } from "./data/outbox";

// Start the offline sync queue (Supabase mode only; no-op in demo).
initOutbox();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
