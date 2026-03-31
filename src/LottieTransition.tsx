import { AbsoluteFill, Video, useCurrentFrame, interpolate } from "remotion";
import { Lottie } from "@remotion/lottie";
import type { LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";
import type { ColorScheme } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TRANSITION_DURATION = 15; // frames (0.25s at 60fps)
const halfDuration = Math.floor(TRANSITION_DURATION / 2);

// Per-URL cache so each transition JSON is fetched once and reused
const cache = new Map<string, LottieAnimationData>();

// Custom CSS-based transitions (faster than Lottie)

const FadeTransition: React.FC<{ colorScheme?: ColorScheme; frame?: number }> = ({ colorScheme, frame: propFrame }) => {
  const frame = propFrame ?? useCurrentFrame();
  const opacity = interpolate(frame, [0, halfDuration], [0, 1]);
  return <AbsoluteFill style={{ backgroundColor: colorScheme?.dark || "#000", opacity }} />;
};

const SlideTransition: React.FC<{ colorScheme?: ColorScheme; frame?: number }> = ({ colorScheme, frame: propFrame }) => {
  const frame = propFrame ?? useCurrentFrame();
  const x = interpolate(frame, [0, halfDuration], [-1080, 0]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ transform: `translateX(${x}px)`, width: "100%", height: "100%", backgroundColor: colorScheme?.highlight || "#fff" }} />
    </AbsoluteFill>
  );
};

const WipeTransition: React.FC<{ colorScheme?: ColorScheme; frame?: number }> = ({ colorScheme, frame: propFrame }) => {
  const frame = propFrame ?? useCurrentFrame();
  const progress = interpolate(frame, [0, halfDuration], [0, 1]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${progress * 100}%`,
          height: "100%",
          backgroundColor: colorScheme?.highlight || "#fff",
        }}
      />
    </AbsoluteFill>
  );
};

const FlashTransition: React.FC<{ colorScheme?: ColorScheme; frame?: number }> = ({ colorScheme, frame: propFrame }) => {
  const frame = propFrame ?? useCurrentFrame();
  const opacity = interpolate(frame, [0, halfDuration / 2, halfDuration], [0, 1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: colorScheme?.light || "#fff", opacity: opacity * 0.9 }} />;
};

export type TransitionType = "fade" | "slide" | "wipe" | "flash" | "lottie";

const TRANSITION_COMPONENTS: Record<TransitionType, React.FC<{ colorScheme?: ColorScheme; frame?: number }>> = {
  fade: FadeTransition,
  slide: SlideTransition,
  wipe: WipeTransition,
  flash: FlashTransition,
  lottie: () => null,
};

export const LottieTransition = ({ src, colorScheme, phase }: { src?: string; colorScheme?: ColorScheme; phase?: "first" | "second" }) => {
  const frame = useCurrentFrame();
  const halfDuration = Math.floor(TRANSITION_DURATION / 2);
  // First phase: frames 0-7 (fade in), Second phase: frames 7-14 (fade out)
  const effectiveFrame = phase === "second" ? frame + halfDuration : frame;
  
  // Handle custom transitions
  if (src && src.startsWith("custom:")) {
    const customType = src.replace("custom:", "") as TransitionType;
    const CustomComp = TRANSITION_COMPONENTS[customType];
    if (CustomComp) return <CustomComp colorScheme={colorScheme} frame={effectiveFrame} />;
  }

  if (!src || src === "none") return null;

  const filePath = src.endsWith(".json") || src.endsWith(".webm") || src.endsWith(".mp4")
    ? `${BASE}/picker/transitions/${src}`
    : src;
    
  const isVideo = filePath.endsWith(".webm") || filePath.endsWith(".mp4");
  const isLottie = filePath.endsWith(".json");

  // For video/lottie - first phase fades in, second phase fades out
  if (phase === "second") {
    const opacity = interpolate(frame, [0, halfDuration], [1, 0]);
    return <AbsoluteFill style={{ backgroundColor: "#000", opacity, zIndex: 100 }} />;
  }

  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(
    isLottie ? (cache.get(filePath) ?? null) : null
  );

  useEffect(() => {
    if (isLottie) {
      const cached = cache.get(filePath);
      if (cached) {
        setAnimationData(cached);
        return;
      }
      setAnimationData(null);
      fetch(filePath)
        .then((res) => res.json())
        .then((data: LottieAnimationData) => {
          cache.set(filePath, data);
          setAnimationData(data);
        });
    }
  }, [filePath, isLottie]);

  // Video transitions
  if (isVideo) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: "screen" }}>
        <Video src={filePath} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "rotate(90deg) scale(2.2)" }} />
      </AbsoluteFill>
    );
  }

  // Lottie transitions
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
}

export const CUSTOM_TRANSITIONS: { value: string; label: string }[] = [
  { value: "custom:fade", label: "Fade" },
  { value: "custom:slide", label: "Slide" },
  { value: "custom:wipe", label: "Wipe" },
  { value: "none", label: "None" },
  { value: "flash.webm", label: "Flash (Video)" },
  { value: "Arrow.json", label: "Arrow (Lottie)" },
  { value: "Box1.json", label: "Box1 (Lottie)" },
  { value: "Box2.json", label: "Box2 (Lottie)" },
];

export { TRANSITION_DURATION };
