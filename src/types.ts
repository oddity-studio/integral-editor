import { z } from "zod";

export const colorSchemeSchema = z.object({
  dark: z.string(),
  light: z.string(),
  highlight: z.string(),
});

export const backgroundVideoSchema = z.object({
  src: z.string(),
  scale: z.number().optional(),
  blendMode: z.string().optional(),
  startFrom: z.number().optional(),
  muted: z.boolean().optional(),
  objectFit: z.string().optional(),
});

export const sceneSchema = z.object({
  text: z.string(),
  layout: z.number().optional(),
  fontSize: z.number().optional(),
  y: z.number().optional(),
  x: z.number().optional(),
  rotateZ: z.number().optional(),
  rotateX: z.number().optional(),
  perspective: z.number().optional(),
  duration: z.number().optional(),
  backgroundVideo: backgroundVideoSchema.optional(),
});

export const videoPropsSchema = z.object({
  seasonNumber: z.string(),
  colorScheme: colorSchemeSchema,
  music: z.string().optional(),
  transition: z.string().optional(),
  font: z.string().optional(),
  scenes: z.array(sceneSchema),
});

export type ColorScheme = z.infer<typeof colorSchemeSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type VideoProps = z.infer<typeof videoPropsSchema>;

export const FPS = 60;
export const DEFAULT_SCENE_DURATION = 3; // seconds

export const getSceneFrames = (scene: Scene): number =>
  (scene.duration ?? DEFAULT_SCENE_DURATION) * FPS;

export const getTotalFrames = (props: VideoProps): number =>
  props.scenes.reduce((sum, s) => sum + getSceneFrames(s), 0);

export const defaultVideoProps: VideoProps = {
  seasonNumber: "01",
  music: "Tournament.mp3",
  transition: "none",
  font: "Dela Gothic One",
  colorScheme: {
    dark: "#953f0c",
    light: "#dfbf67",
    highlight: "#ffaa00",
  },
  scenes: [
    { text: "", fontSize: 80, layout: 12 },
    { text: "New Season Starts Now", fontSize: 150, layout: 0 },
    { text: "Make Your Mark", fontSize: 230, layout: 1 },
    { text: "And Forge Your Legacy", fontSize: 140, layout: 3 },
    { text: "Using Our New Tools", fontSize: 150, layout: 2 },
    { text: "Sounds Packs Effects Tutorials Apps Plugins And More...", fontSize: 150, layout: 8 },
    { text: "Right Here Right Now", fontSize: 150, layout: 9 },
    { text: "", fontSize: 80, layout: 12 },
  ],
};
