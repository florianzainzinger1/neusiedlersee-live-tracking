import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";

import type { AppProps } from "next/app";
import { useTheme } from "../hooks/useTheme";
import { useEffect, useState, useSyncExternalStore } from "react";
import { logFirestorePaths } from "../lib/envBasePath";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

export default function App({ Component, pageProps }: AppProps) {
  useTheme(); // Initializes global dynamic time-of-day theming on the <body> class

  // Performance mode is enabled automatically with prefers-reduced-motion
  // and can be toggled manually with Ctrl + Shift + P (manual choice wins).
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
  const [manualPerfMode, setManualPerfMode] = useState<boolean | null>(null);
  const perfMode = manualPerfMode ?? prefersReducedMotion;

  useEffect(() => {
    logFirestorePaths();
  }, []);

  // Sync the body class with the current mode
  useEffect(() => {
    document.body.classList.toggle("perf-no-blur", perfMode);
    if (perfMode && manualPerfMode === null) {
      console.log("Performance debug mode enabled (prefers-reduced-motion)");
    }
  }, [perfMode, manualPerfMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const isEnabled = !perfMode;
        setManualPerfMode(isEnabled);
        console.log(`Performance debug mode ${isEnabled ? 'ON' : 'OFF'}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [perfMode]);

  return (
    <>
      {perfMode && (
        <div style={{
          position: 'fixed',
          top: '8px',
          right: '8px',
          zIndex: 99999,
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          fontFamily: 'monospace, sans-serif'
        }}>
          PERF MODE: ON
        </div>
      )}
      <Component {...pageProps} />
    </>
  );
}