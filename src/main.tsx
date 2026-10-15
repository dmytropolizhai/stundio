import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { isNativePlatform } from "@/lib/edupage";
import { isDesktop } from "@/lib/desktop";
import App from "./App.tsx";
import "./index.css";
import "./desktop.css";

if (isDesktop()) document.documentElement.dataset.platform = "desktop";

if ("serviceWorker" in navigator && !isNativePlatform() && !isDesktop()) {
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
