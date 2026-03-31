import { AbsoluteFill, Video, useCurrentFrame, interpolate } from "remotion";
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

// Custom CSS-based transitions (faster than Lottie)

const FadeTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, TRANSITION_DURATION], [0, 1]);
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity }} />;
};

const SlideTransition: React.FC<{ direction?: "left" | "right" }> = ({ direction = "right" }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, TRANSITION_DURATION], [direction === "right" ? -1080 : 1080, 0]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ transform: `translateX(${x}px)`, width: "100%", height: "100%", backgroundColor: "#000" }} />
    </AbsoluteFill>
  );
};

const WipeTransition: React.FC<{ direction?: "left" | "right" }> = ({ direction = "right" }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, TRANSITION_DURATION], [0, 1]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          [direction]: 0,
          width: `${progress * 100}%`,
          height: "100%",
          backgroundColor: "#000",
        }}
      />
    </AbsoluteFill>
  );
};

const FlashTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, TRANSITION_DURATION / 2, TRANSITION_DURATION], [0, 1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#fff", opacity: opacity * 0.9 }} />;
};

const ZoomTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, TRANSITION_DURATION], [2, 1]);
  const opacity = interpolate(frame, [0, 10], [0, 1]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#fff",
          transform: `scale(${scale})`,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};

const PixelTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, TRANSITION_DURATION], [0, 1]);
  const blocks = 12;
  const blockSize = 1080 / blocks;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {Array.from({ length: blocks * blocks }).map((_, i) => {
        const row = Math.floor(i / blocks);
        const col = i % blocks;
        const delay = (row + col) / (blocks * 2);
        const show = progress > delay ? interpolate(progress, [delay, delay + 0.2], [0, 1]) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: col * blockSize,
              top: row * blockSize,
              width: blockSize,
              height: blockSize,
              backgroundColor: "#fff",
              opacity: show,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export type TransitionType = "fade" | "slide" | "wipe" | "flash" | "zoom" | "pixel" | "lottie";

const TRANSITION_COMPONENTS: Record<TransitionType, React.FC<any>> = {
  fade: FadeTransition,
  slide: SlideTransition,
  wipe: WipeTransition,
  flash: FlashTransition,
  zoom: ZoomTransition,
  pixel: PixelTransition,
  lottie: () => null,
};

export function Transition({ src }: { src?: string }) {
  const frame = useCurrentFrame();
  
  // Handle custom transitions
  if (src && src.startsWith("custom:")) {
    const customType = src.replace("custom:", "") as TransitionType;
    const CustomComp = TRANSITION_COMPONENTS[customType];
    if (CustomComp) return <CustomComp />;
  }

  if (!src || src === "none") return null;

  const filePath = src.endsWith(".json") || src.endsWith(".webm") || src.endsWith(".mp4")
    ? `${BASE}/picker/transitions/${src}`
    : src;
    
  const isVideo = filePath.endsWith(".webm") || filePath.endsWith(".mp4");
  const isLottie = filePath.endsWith(".json");

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
      preloadTransition(filePath).then((data) => setAnimationData(data));
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
  { value: "custom:flash", label: "Flash" },
  { value: "custom:zoom", label: "Zoom" },
  { value: "custom:pixel", label: "Pixel" },
  { value: "none", label: "None" },
  { value: "flash.json", label: "Flash (Lottie)" },
  { value: "Arrow.json", label: "Arrow (Lottie)" },
  { value: "Box1.json", label: "Box1 (Lottie)" },
  { value: "Box2.json", label: "Box2 (Lottie)" },
];
