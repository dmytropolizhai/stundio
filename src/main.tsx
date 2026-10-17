import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { currentPlatform } from "@/lib/platform";
import App from "./App.tsx";
import "./index.css";
import "./desktop.css";

const platform = currentPlatform();
if (platform === "desktop") document.documentElement.dataset.platform = "desktop";

if ("serviceWorker" in navigator && platform === "web") {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
