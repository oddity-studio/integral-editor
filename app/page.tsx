"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";

const Editor = lazy(() => import("./Editor"));

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PRELOAD_IMAGES = [
  `${BASE}/char1.webp`,
  `${BASE}/char2.webp`,
  `${BASE}/char3.webp`,
  `${BASE}/logo.webp`,
];

function preloadAssets(): Promise<unknown[]> {
  const imageLoads = PRELOAD_IMAGES.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      })
  );
  return Promise.all(imageLoads);
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    preloadAssets().then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(id);
  }, [loaded]);

  const handleReady = useCallback(() => setReady(true), []);

  if (ready) {
    return (
      <Suspense
        fallback={
          <div style={landingStyles.container}>
            <p style={{ fontSize: 14, color: "#64748b" }}>Loading editor...</p>
          </div>
        }
      >
        <Editor />
      </Suspense>
    );
  }

  return (
    <div style={landingStyles.container}>
      <h1 style={landingStyles.title}>Seasonal</h1>
      <p style={landingStyles.subtitle}>Programmatic video creator</p>

      {loaded ? (
        <button onClick={handleReady} style={landingStyles.button}>
          Open Editor
        </button>
      ) : (
        <p style={landingStyles.loading}>Loading assets{dots}</p>
      )}
    </div>
  );
}

const landingStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    color: "#e2e8f0",
    fontFamily: "system-ui, sans-serif",
  },
  title: {
    fontSize: 48,
    fontWeight: 700,
    margin: 0,
    color: "#fff",
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    margin: 0,
  },
  button: {
    marginTop: 24,
    padding: "14px 40px",
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    border: "none",
    backgroundColor: "#e2e8f0",
    color: "#0a0a0a",
    cursor: "pointer",
  },
  loading: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
    marginTop: 24,
  },
};
