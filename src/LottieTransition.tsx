import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ColorScheme } from "./types";

const TRANSITION_DURATION = 15;
const halfDuration = Math.floor(TRANSITION_DURATION / 2);

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

export type TransitionType = "fade" | "slide" | "wipe" | "flash";

const TRANSITION_COMPONENTS: Record<TransitionType, React.FC<{ colorScheme?: ColorScheme; frame?: number }>> = {
  fade: FadeTransition,
  slide: SlideTransition,
  wipe: WipeTransition,
  flash: FlashTransition,
};

export const LottieTransition = ({ src, colorScheme, phase }: { src?: string; colorScheme?: ColorScheme; phase?: "first" | "second" }) => {
  const frame = useCurrentFrame();
  const effectiveFrame = phase === "second" ? frame + halfDuration : frame;
  
  if (!src || src === "none") return null;
  if (!src.startsWith("custom:")) return null;

  const customType = src.replace("custom:", "") as TransitionType;
  const CustomComp = TRANSITION_COMPONENTS[customType];
  if (CustomComp) return <CustomComp colorScheme={colorScheme} frame={effectiveFrame} />;

  return null;
};

export const CUSTOM_TRANSITIONS: { value: string; label: string }[] = [
  { value: "custom:fade", label: "Fade" },
  { value: "custom:slide", label: "Slide" },
  { value: "custom:wipe", label: "Wipe" },
  { value: "none", label: "None" },
];

export { TRANSITION_DURATION };
