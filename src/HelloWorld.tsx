import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  Video,
  Audio,
} from "remotion";
import type { VideoProps, ColorScheme, Scene } from "./types";
import { FPS, DEFAULT_SCENE_DURATION, getSceneFrames } from "./types";
import { LottieTransition, TRANSITION_DURATION, preloadAllTransitions } from "./LottieTransition";
import { loadFont as loadDelaGothicOne } from "@remotion/google-fonts/DelaGothicOne";
import { loadFont as loadExo2 } from "@remotion/google-fonts/Exo2";
import { loadFont as loadPermanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBigShoulders } from "@remotion/google-fonts/BigShoulders";
import { loadFont as loadBowlbyOneSC } from "@remotion/google-fonts/BowlbyOneSC";
import { loadFont as loadFugazOne } from "@remotion/google-fonts/FugazOne";
import { loadFont as loadPassionOne } from "@remotion/google-fonts/PassionOne";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";

type FontConfig = {
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
};

const FONT_MAP: Record<string, FontConfig> = {
  "Dela Gothic One": { fontFamily: loadDelaGothicOne().fontFamily },
  "Exo 2": { fontFamily: loadExo2().fontFamily, fontWeight: 900, fontStyle: "italic" },
  "Permanent Marker": { fontFamily: loadPermanentMarker().fontFamily },
  "Anton": { fontFamily: loadAnton().fontFamily },
  "Big Shoulders": { fontFamily: loadBigShoulders().fontFamily, fontWeight: 600 },
  "Bowlby One SC": { fontFamily: loadBowlbyOneSC().fontFamily },
  "Fugaz One": { fontFamily: loadFugazOne().fontFamily },
  "Passion One": { fontFamily: loadPassionOne().fontFamily, lineHeight: 0.85 },
  "Montserrat": { fontFamily: loadMontserrat().fontFamily, fontWeight: 900, fontStyle: "italic" },
};

export const FONT_OPTIONS = Object.keys(FONT_MAP);

const SCENE_DURATION = DEFAULT_SCENE_DURATION * FPS; // default scene duration in frames

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const CHAR1 = `${BASE}/char1.webp`;
const CHAR2 = `${BASE}/char2.webp`;
const CHAR3 = `${BASE}/char3.webp`;
const LOGO = `${BASE}/logo.webp`;
const BRACKETS = `${BASE}/brackets.webp`;
const BELT1 = `${BASE}/Belt1.webp`;

// Character positioning presets for fight-game style layouts
type CharPlacement = {
  src: string;
  side: "left" | "right";
  scale: number;
  bottomPct: number; // percentage from bottom
  flip?: boolean;
  offsetX?: number; // px offset after slide-in
  widthPct?: number; // if set, size by width % instead of full height
  leftPct?: number; // explicit left position in %
  opacity?: number; // base opacity (defaults to 1)
};

type TextMode = "normal" | "flat" | "scroll";

type CustomControl =
  | { type: "videoUpload"; field: "backgroundVideo"; label?: string };

type SceneLayout = {
  label: string;
  category: string;
  characters: CharPlacement[];
  backgroundVideo?: { src: string; scale?: number; blendMode?: string; startFrom?: number; muted?: boolean };
  backgroundImageSrc?: string;
  textDefaults?: { x?: number; y?: number; fontSize?: number; rotateZ?: number; rotateX?: number; perspective?: number; mode?: TextMode };
  customStyle?: (colors: ColorScheme) => { background: string; textColor: string; textGlow?: string };
  titleCard?: boolean;
  beltStomp?: { src: string };
  customControls?: CustomControl[];
};

const SCENE_LAYOUTS: SceneLayout[] = [
  { label: "S12 Scene1", category: "Season 12", characters: [
    { src: CHAR1, side: "left", scale: 1.2, bottomPct: 0 },
  ], textDefaults: { y: 500, rotateZ: -12, rotateX: 18 } },
  { label: "S12 Scene2", category: "Season 12", characters: [
    { src: CHAR3, side: "left", scale: 1.25, bottomPct: 0, offsetX: -700 },
  ], textDefaults: { y: 100, fontSize: 400, perspective: 0, rotateX: 10, mode: "flat" } },
  { label: "S12 Scene3", category: "Season 12", characters: [
    { src: CHAR2, side: "left", scale: 1.1, bottomPct: 0 },
  ], textDefaults: { x: -20, y: 500, fontSize: 204, rotateZ: -15, rotateX: 22 } },
  { label: "Video Cube", category: "General", characters: [
    { src: CHAR1, side: "right", scale: 1.3, bottomPct: 0, flip: true, offsetX: 80 },
  ], backgroundVideo: { src: "/Cube.mp4", scale: 1.5, blendMode: "screen", startFrom: 300 }, textDefaults: { y: 200, rotateZ: 25, rotateX: -20 } },
  { label: "My Video", category: "General", characters: [
    { src: CHAR1, side: "right", scale: 1.3, bottomPct: 0, flip: true, offsetX: 80 },
  ], backgroundVideo: { src: "/Cube.mp4", scale: 1.5, blendMode: "screen", startFrom: 300 },
    textDefaults: { y: -60, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `radial-gradient(ellipse at 50% 80%, ${c.highlight}, ${c.dark}, #000000)`, textColor: "#ffffff", textGlow: `0 0 20px ${c.highlight}80, 0 4px 30px rgba(0,0,0,0.7)` }),
    customControls: [{ type: "videoUpload", field: "backgroundVideo" }] },
  { label: "Brackets", category: "General", characters: [],
    backgroundImageSrc: BRACKETS, textDefaults: { y: -60, fontSize: 200, mode: "flat" } },
  { label: "Grunge", category: "General", characters: [],
    backgroundVideo: { src: "/Grunge.mp4", scale: 1, blendMode: "screen", startFrom: 0 },
    textDefaults: { y: 200, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `linear-gradient(135deg, ${c.dark}, ${c.dark})`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }) },
  { label: "Belt Stomp", category: "General", characters: [],
    backgroundVideo: { src: "/Grunge.mp4", scale: 1, blendMode: "screen", startFrom: 0 },
    beltStomp: { src: BELT1 },
    textDefaults: { y: 200, fontSize: 120, rotateX: 10, mode: "flat" },
    customStyle: (c) => ({ background: `radial-gradient(circle, ${c.highlight}, ${c.dark})`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }) },
  { label: "S12 Scene4", category: "Season 12", characters: [
    { src: CHAR1, side: "left", scale: 1.15, bottomPct: 0 },
  ], textDefaults: { y: 200, rotateZ: -18, rotateX: -14, mode: "scroll" },
    customStyle: (c) => ({ background: `linear-gradient(135deg, #000000, ${c.dark})`, textColor: "#ffffff" }) },
  { label: "S12 Scene5", category: "Season 12", characters: [
    { src: CHAR3, side: "left", scale: 1.2, bottomPct: 0, opacity: 0.5, offsetX: -500 },
    { src: CHAR2, side: "left", scale: 0.8, bottomPct: 0 },
  ], textDefaults: { y: 200, rotateZ: 14, rotateX: -18 } },
  { label: "S12 Scene6", category: "Season 12", characters: [
    { src: CHAR2, side: "left", scale: 1.25, bottomPct: 0, offsetX: -60 },
  ], textDefaults: { x: 50, y: 600, rotateZ: 18, rotateX: 5 } },
  { label: "S12 Cover", category: "Season 12", characters: [
    { src: CHAR1, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 0, offsetX: 200 },
    { src: CHAR3, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 33.33, offsetX: -200 },
    { src: CHAR2, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 66.66 },
  ], textDefaults: { rotateZ: 10, rotateX: -15 } },
  // S12 Logo — title card as a scene template
  { label: "S12 Logo", category: "Season 12", characters: [
    { src: CHAR1, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 0, offsetX: 200 },
    { src: CHAR3, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 33.33, offsetX: -200 },
    { src: CHAR2, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 66.66 },
  ], titleCard: true, textDefaults: { y: 0, fontSize: 100, mode: "flat" } },
  // Gradients category — no characters, flat text
  { label: "Sunset", category: "Gradients", characters: [],
    textDefaults: { y: 200, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `linear-gradient(180deg, ${c.dark}, #ff6b35, ${c.highlight})`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }) },
  { label: "Neon", category: "Gradients", characters: [],
    textDefaults: { y: 200, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `linear-gradient(135deg, #0a0015, #1a0030, ${c.dark})`, textColor: c.light, textGlow: `0 0 20px ${c.light}, 0 0 60px ${c.light}80, 0 0 120px ${c.light}40` }) },
  { label: "Ocean", category: "Gradients", characters: [],
    textDefaults: { y: -60, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `linear-gradient(180deg, #0c1445, #1a3a6a, ${c.light})`, textColor: c.highlight, textGlow: "0 4px 30px rgba(0,0,0,0.6)" }) },
  { label: "Ember", category: "Gradients", characters: [],
    textDefaults: { y: -60, fontSize: 200, mode: "flat" },
    customStyle: (c) => ({ background: `radial-gradient(ellipse at 50% 80%, ${c.highlight}, ${c.dark}, #000000)`, textColor: "#ffffff", textGlow: `0 0 20px ${c.highlight}80, 0 4px 30px rgba(0,0,0,0.7)` }) },
];

export const LAYOUT_OPTIONS = SCENE_LAYOUTS.map((l, i) => ({ index: i, label: l.label, category: l.category }));
export const getLayoutControls = (index: number): CustomControl[] =>
  SCENE_LAYOUTS[index]?.customControls ?? [];

const FighterChar: React.FC<{
  placement: CharPlacement;
  frame: number;
  fps: number;
  charIndex: number;
  sceneDuration?: number;
}> = ({ placement, frame, fps, charIndex, sceneDuration = SCENE_DURATION }) => {
  // Slide in from the side — simple interpolation instead of spring physics
  const slideFrames = 20;
  const delayFrames = charIndex * 10;
  const slideProgress = Math.min(Math.max((frame - delayFrames) / slideFrames, 0), 1);
  // Ease-out: decelerates into rest position
  const eased = 1 - (1 - slideProgress) * (1 - slideProgress);
  const offscreen = placement.side === "left" ? -600 : 600;
  const restX = placement.offsetX ?? 0;
  const slideX = offscreen + (restX - offscreen) * eased;

  // Idle bob — fighting stance sway
  const bob = Math.sin(frame * 0.06 + charIndex * 2) * 6;
  // Subtle horizontal sway
  const sway = Math.sin(frame * 0.04 + charIndex * 3) * 4;

  // Exit: quick fade via GPU-accelerated filter (avoids expensive opacity compositing on large images)
  const exitStart = sceneDuration - 15;
  const exitProgress = frame > exitStart
    ? interpolate(frame, [exitStart, sceneDuration], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const baseOpacity = placement.opacity ?? 1;
  const exitOpacity = baseOpacity * (1 - exitProgress);

  const isLeft = placement.side === "left";
  const flipX = placement.flip ? -1 : 1;
  const useWidth = placement.widthPct != null;

  if (useWidth) {
    // Column mode: fixed-width container clips a full-height image
    return (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: `${placement.leftPct ?? 0}%`,
          width: `${placement.widthPct}%`,
          height: "100%",
          overflow: "hidden",
          opacity: exitOpacity,
          pointerEvents: "none" as const,
        }}
      >
        <Img
          src={placement.src}
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: `translateX(calc(-50% + ${slideX + sway}px)) translateY(${bob}px) scale(${placement.scale}) scaleX(${flipX})`,
            transformOrigin: "bottom center",
            willChange: "transform",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: `${placement.bottomPct - 2}%`,
        left: isLeft ? "-5%" : undefined,
        right: isLeft ? undefined : "-5%",
        height: "100%",
        opacity: exitOpacity,
        transform: `translateX(${slideX + sway}px) translateY(${bob}px) scale(${placement.scale}) scaleX(${flipX})`,
        transformOrigin: isLeft ? "bottom left" : "bottom right",
        pointerEvents: "none" as const,
        willChange: "transform, opacity",
      }}
    >
      <Img
        src={placement.src}
        style={{ height: "100%", width: "auto", display: "block" }}
      />
    </div>
  );
};

const CharacterLayer: React.FC<{ layoutIndex: number; sceneDuration?: number }> = ({ layoutIndex, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = SCENE_LAYOUTS[layoutIndex % SCENE_LAYOUTS.length];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {layout.characters.map((placement, ci) => (
        <FighterChar
          key={ci}
          placement={placement}
          frame={frame}
          fps={fps}
          charIndex={ci}
          sceneDuration={sceneDuration}
        />
      ))}
    </div>
  );
};

const SoundWaveform: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.5 } });
  const BAR_COUNT = 48;
  const BAR_WIDTH = 1080 / BAR_COUNT;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 600,
        display: "flex",
        alignItems: "flex-end",
        gap: 0,
        opacity: enter * 0.7,
        mixBlendMode: "screen" as const,
        pointerEvents: "none" as const,
      }}
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        // Slower waves with strong per-bar variation via large phase offsets
        const seed = ((i * 137.5) % 17) + i * 0.3;
        const h1 = Math.sin(frame * 0.12 + seed * 2.5) * 0.5 + 0.5;
        const h2 = Math.sin(frame * 0.18 + seed * 4.1 + 3) * 0.5 + 0.5;
        const h3 = Math.cos(frame * 0.09 + seed * 1.7 + 7) * 0.5 + 0.5;
        // Mix so bars peak at very different times
        const raw = h1 * 0.4 + h2 * 0.35 + h3 * 0.25;
        const height = raw * raw * 500 * enter + 6;
        return (
          <div
            key={i}
            style={{
              width: BAR_WIDTH - 2,
              height,
              marginLeft: 1,
              marginRight: 1,
              backgroundColor: color,
              borderRadius: 3,
              opacity: 0.6 + h1 * 0.4,
            }}
          />
        );
      })}
    </div>
  );
};

const BeltStompLayer: React.FC<{ src: string; sceneDuration: number }> = ({ src, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom in over ~20 frames with ease-in, then sudden hard stop — starts immediately
  const zoomFrames = 20;
  const progress = Math.min(frame / zoomFrames, 1);
  const eased = progress * progress; // ease-in: accelerates into the stop
  const scale = interpolate(eased, [0, 1], [0.1, 2]);
  const opacity = interpolate(progress, [0, 0.05], [0, 1], { extrapolateRight: "clamp" });

  // Shake after stomp lands
  const afterStomp = frame - zoomFrames;
  const shakeX = afterStomp > 0 && afterStomp < 15
    ? Math.sin(afterStomp * 2.5) * 8 * (1 - afterStomp / 15)
    : 0;
  const shakeY = afterStomp > 0 && afterStomp < 15
    ? Math.cos(afterStomp * 3.2) * 6 * (1 - afterStomp / 15)
    : 0;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: "15%",
      zIndex: 8,
      pointerEvents: "none" as const,
    }}>
      <Img
        src={src}
        style={{
          width: "80%",
          height: "auto",
          transform: `scale(${scale}) translate(${shakeX}px, ${shakeY}px)`,
          opacity,
          filter: `drop-shadow(0 0 30px rgba(0,0,0,0.5))`,
        }}
      />
    </div>
  );
};

const BracketsLayer: React.FC<{ src: string; sceneDuration: number }> = ({ src, sceneDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });

  // Movement keyframes as fraction of scene duration
  // Directions: down-right, pause, up-right, pause, down-left
  const t = frame / sceneDuration;
  const moveAmt = 500; // pixels of travel per segment

  // Straight directions: down, pause, right, pause, up, pause, right
  // 0.00-0.18: down
  // 0.18-0.25: pause
  // 0.25-0.43: right
  // 0.43-0.50: pause
  // 0.50-0.68: up
  // 0.68-0.75: pause
  // 0.75-0.93: right
  // 0.93-1.00: pause
  const moveX = 1000; // horizontal movement
  let dx = 0;
  let dy = 0;

  if (t < 0.18) {
    const p = t / 0.18;
    dy = p * moveAmt;
  } else if (t < 0.25) {
    dy = moveAmt;
  } else if (t < 0.43) {
    const p = (t - 0.25) / 0.18;
    dx = p * moveX;
    dy = moveAmt;
  } else if (t < 0.50) {
    dx = moveX;
    dy = moveAmt;
  } else if (t < 0.68) {
    const p = (t - 0.50) / 0.18;
    dx = moveX;
    dy = moveAmt - p * moveAmt;
  } else if (t < 0.75) {
    dx = moveX;
    dy = 0;
  } else if (t < 0.93) {
    const p = (t - 0.75) / 0.18;
    dx = moveX + p * moveX;
  } else {
    dx = moveX * 2;
  }

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      opacity: enter,
      mixBlendMode: "screen" as const,
    }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "350%",
          height: "auto",
          transform: `translate(${-dx}px, ${-dy}px)`,
          willChange: "transform",
        }}
      />
    </div>
  );
};

const SceneCard: React.FC<{ text: string; index: number; layoutIndex: number; colors: ColorScheme; fontConfig: FontConfig; fontSize?: number; y?: number; x?: number; rotateZ?: number; rotateX?: number; perspective?: number; backgroundVideo?: Scene["backgroundVideo"]; sceneDuration?: number }> = ({
  text,
  index,
  layoutIndex,
  colors,
  fontConfig,
  fontSize = 150,
  y: yOffset = 0,
  x: xOffset = 0,
  rotateZ: rZ,
  rotateX: rX,
  perspective: persp,
  backgroundVideo: backgroundVideoProp,
  sceneDuration: dur = SCENE_DURATION,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use scene-level values if provided, otherwise fall back to layout defaults
  const resolvedLayout = SCENE_LAYOUTS[layoutIndex % SCENE_LAYOUTS.length];
  const td = resolvedLayout.textDefaults;
  const backgroundVideo = backgroundVideoProp ?? resolvedLayout.backgroundVideo;
  const resolvedFontSize = fontSize ?? td?.fontSize ?? 150;
  const resolvedX = xOffset || td?.x || 0;
  const resolvedY = yOffset || td?.y || 0;

  // Delay text entrance if belt stomp is present (wait for belt to land)
  const textDelay = resolvedLayout.beltStomp ? 25 : 0;
  const textFrame = Math.max(0, frame - textDelay);
  const enter = spring({ frame: textFrame, fps, config: { damping: 200 } });
  const exitStart = dur - 30;
  const exit = frame > exitStart ? interpolate(frame, [exitStart, dur], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [40, 0]) + resolvedY;

  // Scene style — use customStyle from layout if available, otherwise cycle variants
  const custom = resolvedLayout.customStyle?.(colors);
  const variant = layoutIndex % 4;
  let background: string;
  let textColor: string;
  let textGlow = "0 4px 20px rgba(0,0,0,0.7)";

  if (custom) {
    background = custom.background;
    textColor = custom.textColor;
    if (custom.textGlow) textGlow = custom.textGlow;
  } else {
    switch (variant) {
      case 0:
        background = `linear-gradient(135deg, ${colors.dark}, #000000)`;
        textColor = colors.highlight;
        break;
      case 1:
        background = `linear-gradient(135deg, ${colors.dark}, ${colors.light}, ${colors.highlight})`;
        textColor = "#000000";
        textGlow = `0 0 30px color-mix(in srgb, ${colors.light} 60%, transparent)`;
        break;
      case 2:
        background = `linear-gradient(135deg, ${colors.light}, #ffffff)`;
        textColor = colors.dark;
        textGlow = `0 0 30px color-mix(in srgb, ${colors.light} 60%, transparent)`;
        break;
      case 3:
      default:
        background = `linear-gradient(135deg, #000000, ${colors.dark})`;
        textColor = "#ffffff";
        break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background,
      }}
    >
      {/* Background video layer */}
      {backgroundVideo && (
        <AbsoluteFill
          style={{
            overflow: "hidden",
            mixBlendMode: (backgroundVideo.blendMode as React.CSSProperties["mixBlendMode"]) ?? "normal",
          }}
        >
          <Video
            src={backgroundVideo.src.startsWith("blob:") || backgroundVideo.src.startsWith("data:") ? backgroundVideo.src : `${BASE}${backgroundVideo.src}`}
            muted={backgroundVideo.muted !== false}
            startFrom={backgroundVideo.startFrom ?? 0}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${backgroundVideo.scale ?? 1})`,
            }}
          />
          {backgroundVideo.blendMode === "normal" && (
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "50%",
              background: `linear-gradient(to top, ${colors.dark}, transparent)`,
              pointerEvents: "none" as const,
            }} />
          )}
        </AbsoluteFill>
      )}

      {/* Sound waveform for scroll-mode scenes — behind characters */}
      {td?.mode === "scroll" && <SoundWaveform color={colors.light} />}

      {/* Background image layer (e.g. brackets) */}
      {resolvedLayout.backgroundImageSrc && (
        <BracketsLayer src={resolvedLayout.backgroundImageSrc} sceneDuration={dur} />
      )}

      {/* Belt stomp layer */}
      {resolvedLayout.beltStomp && (
        <BeltStompLayer src={resolvedLayout.beltStomp.src} sceneDuration={dur} />
      )}

      {/* Character layer */}
      <CharacterLayer layoutIndex={layoutIndex} sceneDuration={dur} />

      {/* Text overlay */}
      {(() => {
        const textMode: TextMode = td?.mode ?? "normal";
        const isFlat = textMode === "flat";
        const isScroll = textMode === "scroll";
        const a = { z: rZ ?? td?.rotateZ ?? 0, x: rX ?? td?.rotateX ?? 0 };
        const perspectiveVal = isFlat ? 0 : (persp ?? td?.perspective ?? 400);

        const words = text.split(" ");
        const totalWords = words.length;
        const revealWindow = dur - 50;
        const lineHeight = resolvedFontSize * 1.1;

        // Batch springs: compute a fixed number of keyframe springs and lerp per word
        const SPRING_KEYS = Math.min(totalWords, 6);
        const keySprings = Array.from({ length: SPRING_KEYS }, (_, ki) => {
          const keyDelay = SPRING_KEYS > 1 ? (ki / (SPRING_KEYS - 1)) * revealWindow * 0.6 : 0;
          return spring({ frame, fps, config: { damping: 14, mass: 0.6 }, delay: keyDelay });
        });
        const wordSprings = words.map((_, wi) => {
          if (totalWords <= 1) return keySprings[0];
          const t = (wi / (totalWords - 1)) * (SPRING_KEYS - 1);
          const lo = Math.floor(t);
          const hi = Math.min(lo + 1, SPRING_KEYS - 1);
          const frac = t - lo;
          return keySprings[lo] * (1 - frac) + keySprings[hi] * frac;
        });

        // Shift container up so the newest word stays at screen center
        const visibleProgress = wordSprings.reduce((sum, s) => sum + s, 0);
        // Scroll mode: linear scroll from bottom to top
        const scrollOffset = isScroll
          ? interpolate(frame, [0, dur], [500, -totalWords * lineHeight * 0.6])
          : 0;
        const shiftUp = isFlat ? 0 : isScroll ? -scrollOffset : Math.max(0, visibleProgress - 1) * lineHeight;

        return (
          <div
            style={{
              opacity: isScroll ? 1 : exit,
              transform: isFlat
                ? `rotateZ(${a.z}deg) rotateX(${a.x}deg) translateX(${resolvedX}px) translateY(${resolvedY}px)`
                : `perspective(${perspectiveVal}px) rotateZ(${a.z}deg) rotateX(${a.x}deg) translateX(${resolvedX}px) translateY(${y}px)`,
              textAlign: "center",
              padding: "0 80px",
              zIndex: 12,
            }}
          >
            <div
              style={{
                transform: `translateY(${-shiftUp}px)`,
              }}
            >
            {words.map((word, wi) => {
              const wordY = (isFlat || isScroll) ? 0 : interpolate(wordSprings[wi], [0, 1], [30, 0]);
              const wordOpacity = isFlat
                ? interpolate(wordSprings[wi], [0, 0.5], [0, 1], { extrapolateRight: "clamp" })
                : isScroll ? enter : wordSprings[wi];
              return (
                <p
                  key={wi}
                  style={{
                    fontSize: resolvedFontSize,
                    fontFamily: fontConfig.fontFamily,
                    fontWeight: fontConfig.fontWeight ?? 700,
                    fontStyle: fontConfig.fontStyle ?? "normal",
                    color: textColor,
                    margin: 0,
                    lineHeight: fontConfig.lineHeight ?? 1.0,
                    letterSpacing: 8,
                    textTransform: "uppercase",
                    textShadow: textGlow,
                    mixBlendMode: custom ? "normal" : (variant === 1 || variant === 2 ? "overlay" : "screen"),
                    opacity: wordOpacity,
                    transform: isFlat ? "none" : `translateY(${wordY}px)`,
                  }}
                >
                  {word}
                </p>
              );
            })}
            </div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ colorScheme: VideoProps["colorScheme"]; layoutIndex: number; fontConfig: FontConfig; text?: string; fontSize?: number }> = ({ colorScheme, layoutIndex, fontConfig, text, fontSize = 100 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(135deg, #000000, ${colorScheme.dark})`,
      }}
    >
      <CharacterLayer layoutIndex={layoutIndex} />

      {/* Explosion burst on logo impact */}
      {(() => {
        const stomp = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 1.2 } });
        const burstProgress = interpolate(stomp, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        // Radial rays
        const rayCount = 12;
        const rays = Array.from({ length: rayCount }, (_, i) => {
          const angle = (i / rayCount) * 360;
          const rayLength = interpolate(burstProgress, [0, 1], [0, 600 + (i % 3) * 200]);
          const rayOpacity = interpolate(burstProgress, [0, 0.1, 0.6, 1], [0, 0.8, 0.3, 0]);
          return { angle, rayLength, rayOpacity };
        });

        return (
          <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" as const, overflow: "hidden" }}>
            {/* Radial light rays */}
            {rays.map((ray, i) => (
              <div key={i} style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 3,
                height: ray.rayLength,
                background: `linear-gradient(to bottom, ${colorScheme.highlight}, transparent)`,
                transformOrigin: "top center",
                transform: `rotate(${ray.angle}deg)`,
                opacity: ray.rayOpacity,
              }} />
            ))}
            {/* Center flash */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -100,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, ${colorScheme.highlight}80 40%, transparent 70%)`,
              transform: `scale(${interpolate(burstProgress, [0, 0.3, 1], [0, 2, 3])})`,
              opacity: interpolate(burstProgress, [0, 0.1, 0.4, 1], [0, 1, 0.4, 0]),
            }} />
          </div>
        );
      })()}

      {/* Logo stomp */}
      {(() => {
        // Heavy stomp: starts overscaled, slams down with high stiffness
        const stomp = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 1.2 } });
        const logoScale = interpolate(stomp, [0, 1], [2.5, 1]);
        const logoOpacity = interpolate(stomp, [0, 0.15], [0, 1], { extrapolateRight: "clamp" });
        // Subtle breathe after landing — very minimal
        const breathe = stomp >= 0.95 ? Math.sin((frame - 20) * 0.03) * 0.015 : 0;
        const glowIntensity = interpolate(stomp, [0, 0.3, 1], [80, 50, 20]);
        return (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${logoScale + breathe})`,
              opacity: logoOpacity,
              zIndex: 10,
              filter: `drop-shadow(0 0 ${glowIntensity}px rgba(255,255,255,0.8)) drop-shadow(0 0 ${glowIntensity * 2}px ${colorScheme.highlight})`,
            }}
          >
            <Img
              src={LOGO}
              style={{ width: 1000, height: "auto" }}
            />
          </div>
        );
      })()}

      {/* Optional text in bottom quarter */}
      {text && (() => {
        const textDelay = 15;
        const textIn = spring({ frame: Math.max(0, frame - textDelay), fps, config: { damping: 14, stiffness: 120 } });
        const textOpacity = interpolate(textIn, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
        const textY = interpolate(textIn, [0, 1], [40, 0]);
        return (
          <div style={{
            position: "absolute",
            bottom: "18%",
            left: 0,
            right: 0,
            zIndex: 15,
            display: "flex",
            justifyContent: "center",
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}>
            <div style={{
              fontFamily: fontConfig.fontFamily,
              fontWeight: fontConfig.fontWeight,
              fontSize,
              color: colorScheme.highlight,
              textAlign: "center",
              textTransform: "uppercase",
              lineHeight: 1.1,
              textShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 40px ${colorScheme.dark}`,
              maxWidth: "80%",
            }}>
              {text}
            </div>
          </div>
        );
      })()}

    </AbsoluteFill>
  );
};

export const HelloWorld: React.FC<VideoProps> = ({ colorScheme, scenes, music = "Tournament.mp3", transition = "flash.json", font = "Dela Gothic One" }) => {
  const fontConfig = FONT_MAP[font] || FONT_MAP["Dela Gothic One"];

  // Preload all Lottie transitions on first render
  preloadAllTransitions();

  // Compute cumulative start positions for variable-duration scenes
  const sceneStarts: number[] = [];
  let offset = 0;
  for (const scene of scenes) {
    sceneStarts.push(offset);
    offset += getSceneFrames(scene);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Background music */}
      {music !== "none" && <Audio src={`${BASE}/picker/music/${music}`} volume={1} />}

      {/* Scene cards with Lottie transitions overlaid at scene start */}
      {scenes.map((scene, i) => {
        const sceneStart = sceneStarts[i];
        const sceneFrames = getSceneFrames(scene);
        const transitionOffset = transition === "flash.webm" ? 12 : 18;
        const sceneLayoutIndex = scene.layout ?? i;
        const sceneLayout = SCENE_LAYOUTS[sceneLayoutIndex % SCENE_LAYOUTS.length];
        return (
          <React.Fragment key={i}>
            {/* Scene card or title card */}
            <Sequence
              from={sceneStart}
              durationInFrames={sceneFrames}
            >
              {sceneLayout.titleCard ? (
                <TitleCard colorScheme={colorScheme} fontConfig={fontConfig} layoutIndex={sceneLayoutIndex} text={scene.text} fontSize={scene.fontSize} />
              ) : (
                <SceneCard text={scene.text} index={i} layoutIndex={sceneLayoutIndex} colors={colorScheme} fontConfig={fontConfig} fontSize={scene.fontSize} y={scene.y} x={scene.x} rotateZ={scene.rotateZ} rotateX={scene.rotateX} perspective={scene.perspective} backgroundVideo={scene.backgroundVideo} sceneDuration={sceneFrames} />
              )}
            </Sequence>
            {/* Transition overlay */}
            {transition !== "none" && (
              <Sequence
                from={sceneStart - transitionOffset}
                durationInFrames={TRANSITION_DURATION}
              >
                <LottieTransition src={`${BASE}/picker/transitions/${transition}`} />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
