import { AbsoluteFill, Video, useCurrentFrame } from "remotion";
import { Lottie } from "@remotion/lottie";
import type { LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TRANSITION_DURATION = 30; // frames (0.5s at 60fps)

// Per-URL cache so each transition JSON is fetched once and reused
const cache = new Map<string, LottieAnimationData>();
const pending = new Map<string, Promise<LottieAnimationData>>();

// Preload all available transitions
const TRANSITIONS = ["flash.json", "Arrow.json", "Box1.json", "Box2.json"];

function preloadTransition(url: string): Promise<LottieAnimationData> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => res.json())
      .then((data: LottieAnimationData) => {
        cache.set(url, data);
        pending.delete(url);
        return data;
      });
    pending.set(url, p);
  }
  return p;
}

export function preloadAllTransitions() {
  TRANSITIONS.forEach((t) => {
    preloadTransition(`${BASE}/picker/transitions/${t}`);
  });
}

// Animation is 1920x1080 (landscape), video is 1080x1920 (portrait)

const Transition: React.FC<{ src?: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const filePath = src || `${BASE}/picker/transitions/flash.json`;
  const isVideo = filePath.endsWith(".webm") || filePath.endsWith(".mp4");

  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(
    !isVideo ? (cache.get(filePath) ?? null) : null
  );

  useEffect(() => {
    if (isVideo) return;
    const cached = cache.get(filePath);
    if (cached) {
      setAnimationData(cached);
      return;
    }
    setAnimationData(null);
    preloadTransition(filePath).then((data) => setAnimationData(data));
  }, [filePath, isVideo]);

  if (isVideo) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: "screen" }}>
        <Video src={filePath} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "rotate(90deg) scale(2.2)" }} />
      </AbsoluteFill>
    );
  }

  if (!animationData) {
    const opacity = frame < TRANSITION_DURATION / 2
      ? frame / (TRANSITION_DURATION / 2)
      : 1 - (frame - TRANSITION_DURATION / 2) / (TRANSITION_DURATION / 2);
    return (
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: Math.max(0, Math.min(1, opacity)), mixBlendMode: "screen", transform: "rotate(90deg)" }} />
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: "screen" }}>
      <Lottie animationData={animationData} playbackRate={1} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "rotate(90deg) scale(2.2)" }} />
    </AbsoluteFill>
  );
};

export { Transition as LottieTransition, TRANSITION_DURATION };
