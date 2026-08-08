import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// IBM Plex — deliberate typographic choice: same type family IBM ships
// in Carbon, self-hosted via fontsource (no external font requests).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";

import App from "@/App.jsx";

// Product default is the dark "Command" theme.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
