import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

if (!window.location.hash && window.location.pathname !== "/") {
  window.history.replaceState(
    null,
    "",
    `/#${window.location.pathname}${window.location.search}`
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
