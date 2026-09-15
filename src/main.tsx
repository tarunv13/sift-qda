import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { initTheme } from "./lib/theme";
import "./index.css";

// Apply the saved theme before the first render so the app never flashes the wrong colours.
initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
