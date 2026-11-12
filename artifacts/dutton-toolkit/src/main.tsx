import { Capacitor } from "@capacitor/core";
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Loading App inside the boundary also catches rejected module imports, which
// otherwise leave an empty WebView before React mounts.
const App = lazy(() => import("./App"));

class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Dutton Connect] Startup failed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: "max(48px, env(safe-area-inset-top)) 24px", fontFamily: "sans-serif", color: "#0f172a", background: "#f8fafc", minHeight: "100dvh" }}>
          <h1>Dutton Connect couldn’t start</h1>
          <p>Please close and reopen the app. If this continues, share the message below with support.</p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: "12px 20px" }}>Try again</button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StartupErrorBoundary>
    <Suspense fallback={<div style={{ padding: 48, fontFamily: "sans-serif" }}>Starting Dutton Connect…</div>}>
      <App />
    </Suspense>
  </StartupErrorBoundary>,
);

if (Capacitor.isNativePlatform()) {
  // Native assets are already bundled. A PWA worker must not retain an old
  // index.html whose hashed scripts no longer exist after a TestFlight update.
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => console.warn("[Dutton Connect] Worker cleanup failed:", error));
  }
  if ("caches" in window) {
    void caches.delete("dutton-toolkit-v1")
      .catch((error) => console.warn("[Dutton Connect] Cache cleanup failed:", error));
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[sw] registration failed", err));
  });
}
