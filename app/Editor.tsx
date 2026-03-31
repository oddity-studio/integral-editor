"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Player, type PlayerRef, Thumbnail } from "@remotion/player";
import { HelloWorld, LAYOUT_OPTIONS, FONT_OPTIONS, getLayoutControls } from "@/src/HelloWorld";
import { CUSTOM_TRANSITIONS } from "@/src/LottieTransition";
import { defaultVideoProps, videoPropsSchema, FPS, DEFAULT_SCENE_DURATION, getSceneFrames, getTotalFrames } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";

const SCENE_DURATION = DEFAULT_SCENE_DURATION * FPS;

export default function Editor() {
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [recordingMode, setRecordingMode] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const playerRef = useRef<PlayerRef>(null);

  // Group layouts by category
  const categories = LAYOUT_OPTIONS.reduce<Record<string, typeof LAYOUT_OPTIONS>>((acc, opt) => {
    (acc[opt.category] ??= []).push(opt);
    return acc;
  }, {});

  const handleDownload = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert(
        'Screen capture not supported. Use Chrome or run "npm run render" for offline export.',
      );
      return;
    }
    if (typeof VideoEncoder === "undefined") {
      alert(
        'Video encoding not supported. Use Chrome 94+ or run "npm run render" for offline export.',
      );
      return;
    }

    const totalFrames = getTotalFrames(props);
    const durationMs = (totalFrames / FPS) * 1000;

    setRendering(true);
    setRecordingMode(true);
    setRenderProgress(0);

    // Wait for recording overlay to render
    await new Promise((r) => setTimeout(r, 600));

    let displayStream: MediaStream | null = null;

    try {
      const playerWrap = document.querySelector(
        ".player-wrap",
      ) as HTMLElement;
      if (!playerWrap) throw new Error("Player element not found");

      // Pre-load and decode audio
      const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const audioCtx = new AudioContext();
      const audioResp = await fetch(`${BASE}/picker/music/${props.music || "Tournament.mp3"}`);
      const audioBuf = await audioCtx.decodeAudioData(
        await audioResp.arrayBuffer(),
      );
      await audioCtx.close();

      // Set up MP4 muxer
      const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        firstTimestampBehavior: "offset",
        video: { codec: "avc", width: 1080, height: 1920 },
        audio: {
          codec: "aac",
          sampleRate: audioBuf.sampleRate,
          numberOfChannels: audioBuf.numberOfChannels,
        },
        fastStart: "in-memory",
      });

      // Video encoder (H.264)
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("VideoEncoder:", e),
      });
      videoEncoder.configure({
        codec: "avc1.640034",
        width: 1080,
        height: 1920,
        bitrate: 10_000_000,
        framerate: FPS,
      });

      // Audio encoder (AAC)
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error("AudioEncoder:", e),
      });
      audioEncoder.configure({
        codec: "mp4a.40.2",
        sampleRate: audioBuf.sampleRate,
        numberOfChannels: audioBuf.numberOfChannels,
        bitrate: 128_000,
      });

      // Capture the current tab
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: FPS } },
        // @ts-expect-error preferCurrentTab is a newer Chrome API
        preferCurrentTab: true,
      });

      // Crop to the player element if CropTarget is available (Chrome 104+)
      let cropSuccess = false;
      // @ts-expect-error CropTarget is a newer Chrome API
      if (typeof CropTarget !== "undefined") {
        try {
          // @ts-expect-error CropTarget is a newer Chrome API
          const ct = await CropTarget.fromElement(playerWrap);
          // @ts-expect-error cropTo is a newer Chrome API
          await displayStream.getVideoTracks()[0].cropTo(ct);
          cropSuccess = true;
        } catch {
          /* CropTarget not supported, fall back to manual crop */
        }
      }

      // For manual crop fallback: get player position
      const rect = playerWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.round(rect.left * dpr);
      const sy = Math.round(rect.top * dpr);
      const sw = Math.round(rect.width * dpr);
      const sh = Math.round(rect.height * dpr);

      // Offscreen canvas for frame resizing
      const offscreen = new OffscreenCanvas(1080, 1920);
      const offCtx = offscreen.getContext("2d")!;

      // Start playback
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
      const startTime = performance.now();
      let frameCount = 0;

      // Read frames from the captured video track
      const videoTrack = displayStream.getVideoTracks()[0];
      const processor = new MediaStreamTrackProcessor({ track: videoTrack });
      const reader = processor.readable.getReader();

      while (true) {
        const { value: frame, done } = await reader.read();
        if (done || !frame) break;

        const elapsed = performance.now() - startTime;
        if (elapsed >= durationMs) {
          frame.close();
          break;
        }

        // Draw frame to offscreen canvas (crop if needed, always resize to 1080x1920)
        if (cropSuccess) {
          offCtx.drawImage(frame, 0, 0, 1080, 1920);
        } else {
          offCtx.drawImage(frame, sx, sy, sw, sh, 0, 0, 1080, 1920);
        }

        const outputFrame = new VideoFrame(offscreen, {
          timestamp: frame.timestamp,
        });
        videoEncoder.encode(outputFrame, {
          keyFrame: frameCount % 120 === 0,
        });
        outputFrame.close();
        frame.close();
        frameCount++;

        setRenderProgress(
          Math.min(95, Math.round((elapsed / durationMs) * 100)),
        );
      }

      // Stop capture + playback
      playerRef.current?.pause();
      videoTrack.stop();
      displayStream.getTracks().forEach((t) => t.stop());
      displayStream = null;

      // Encode audio from the decoded WAV buffer
      const CHUNK_SIZE = 1024;
      const maxSamples = Math.min(
        audioBuf.length,
        Math.ceil((audioBuf.sampleRate * durationMs) / 1000),
      );
      for (let i = 0; i < maxSamples; i += CHUNK_SIZE) {
        const len = Math.min(CHUNK_SIZE, maxSamples - i);
        const data = new Float32Array(len * audioBuf.numberOfChannels);
        for (let c = 0; c < audioBuf.numberOfChannels; c++) {
          data.set(
            audioBuf.getChannelData(c).subarray(i, i + len),
            c * len,
          );
        }
        const ad = new AudioData({
          format: "f32-planar",
          sampleRate: audioBuf.sampleRate,
          numberOfFrames: len,
          numberOfChannels: audioBuf.numberOfChannels,
          timestamp: Math.round((i / audioBuf.sampleRate) * 1_000_000),
          data,
        });
        audioEncoder.encode(ad);
        ad.close();
      }

      // Finalize MP4
      await videoEncoder.flush();
      await audioEncoder.flush();
      videoEncoder.close();
      audioEncoder.close();
      muxer.finalize();

      setRenderProgress(100);

      // Download
      const blob = new Blob([target.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // User cancelled the share dialog — no alert needed
      } else {
        console.error(err);
        alert("Recording failed. Check the console for details.");
      }
    } finally {
      displayStream?.getTracks().forEach((t) => t.stop());
      setRendering(false);
      setRecordingMode(false);
      setRenderProgress(0);
    }
  }, [props]);

  const updateScene = (
    index: number,
    field: keyof Scene,
    value: string | number | Scene["backgroundVideo"],
  ) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const addScene = () => {
    setProps((prev) => ({
      ...prev,
      scenes: [...prev.scenes, { text: "", fontSize: 150 }],
    }));
  };

  const updateColor = (key: keyof ColorScheme, value: string) => {
    setProps((prev) => ({
      ...prev,
      colorScheme: { ...prev.colorScheme, [key]: value },
    }));
  };

  const removeScene = (index: number) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, i) => i !== index),
    }));
  };

  const totalFrames = getTotalFrames(props);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Seasonal Video Creator</h1>

      <div style={styles.main}>
        <div
          style={recordingMode ? styles.recordingOverlay : styles.preview}
          data-player
        >
          {!recordingMode && (
            <style>{`
              .player-wrap [data-remotion-player-controls] {
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
              }
              .player-wrap:hover [data-remotion-player-controls] {
                opacity: 1 !important;
              }
            `}</style>
          )}
          <div
            className="player-wrap"
            style={recordingMode ? styles.recordingPlayerWrap : undefined}
          >
            <Player
              ref={playerRef}
              component={HelloWorld}
              schema={videoPropsSchema}
              inputProps={props}
              durationInFrames={Math.max(1, totalFrames)}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={
                recordingMode
                  ? { width: "100%", height: "100%" }
                  : { width: "100%", aspectRatio: "9/16" }
              }
              controls={!recordingMode}
              clickToPlay={!recordingMode}
              loop={!recordingMode}
              renderLoading={() => (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "9/16",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#000",
                  }}
                >
                  <p style={{ color: "#666", fontSize: 14 }}>
                    Loading assets...
                  </p>
                </div>
              )}
            />
          </div>
          {!recordingMode && (
            <button
              style={{
                ...styles.downloadButton,
                opacity: rendering ? 0.6 : 1,
                cursor: rendering ? "not-allowed" : "pointer",
              }}
              onClick={handleDownload}
              disabled={rendering}
            >
              {rendering
                ? `Recording\u2026 ${renderProgress}%`
                : "Download MP4"}
            </button>
          )}
        </div>

        {!recordingMode && (
          <div style={styles.controls}>
            <div style={styles.customizeHeader}>
              <h2 style={styles.controlsHeading}>Customize</h2>
              <button
                style={styles.galleryButton}
                onClick={() => setShowGallery(true)}
              >
                Scene Gallery
              </button>
            </div>

            <div>
              <span style={styles.label}>Color Scheme</span>
              <div style={styles.colorRow}>
                {(["dark", "light", "highlight"] as const).map((key) => (
                  <label key={key} style={styles.colorLabel}>
                    <input
                      type="color"
                      value={props.colorScheme[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      style={styles.colorInput}
                    />
                    <span style={styles.colorName}>{key}</span>
                    <span style={styles.colorHex}>
                      {props.colorScheme[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span style={styles.label}>Style</span>
              <div style={styles.styleRow}>
                <label style={styles.styleLabel}>
                  Music
                  <select
                    style={styles.layoutSelect}
                    value={props.music || "Tournament.mp3"}
                    onChange={(e) =>
                      setProps((prev) => ({ ...prev, music: e.target.value }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="Tournament.mp3">Tournament</option>
                    <option value="Main Lobby.mp3">Main Lobby</option>
                    <option value="Sydosys.mp3">Sydosys</option>
                  </select>
                </label>
                <label style={styles.styleLabel}>
                  Transition
                  <select
                    style={styles.layoutSelect}
                    value={props.transition || "custom:flash"}
                    onChange={(e) =>
                      setProps((prev) => ({ ...prev, transition: e.target.value }))
                    }
                  >
                    {CUSTOM_TRANSITIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.styleLabel}>
                  Font
                  <select
                    style={styles.layoutSelect}
                    value={props.font || "Dela Gothic One"}
                    onChange={(e) =>
                      setProps((prev) => ({ ...prev, font: e.target.value }))
                    }
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div style={styles.scenesHeader}>
              <span style={styles.label}>Scenes</span>
              <button style={styles.addButton} onClick={addScene}>
                + Add Scene
              </button>
            </div>

            <div style={styles.scenesList}>
              {/* Column headers */}
              <div style={styles.sceneRow}>
                <span style={styles.sceneNumber}></span>
                <span style={styles.columnHeader}>Design</span>
                <span style={{ flex: 1 }}></span>
                <span style={{ ...styles.columnHeader, width: 56, textAlign: "center" as const }}>Size</span>
                <span style={{ ...styles.columnHeader, width: 44, textAlign: "center" as const }}>Time</span>
                <span style={{ width: 22 }}></span>
              </div>

              {/* Scene rows */}
              {props.scenes.map((scene, i) => (
                <div key={i} style={styles.sceneRow}>
                  <span style={styles.sceneNumber}>{i + 1}</span>
                  <select
                    style={styles.layoutSelect}
                    value={scene.layout ?? i}
                    onChange={(e) =>
                      updateScene(i, "layout", Number(e.target.value))
                    }
                    title="Scene template"
                  >
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.index} value={opt.index}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    style={styles.sceneInput}
                    value={scene.text}
                    onChange={(e) => updateScene(i, "text", e.target.value)}
                    placeholder={`Scene ${i + 1} text...`}
                  />
                  {getLayoutControls(scene.layout ?? i).map((ctrl, ci) => {
                    if (ctrl.type === "videoUpload") {
                      const isMuted = scene.backgroundVideo?.muted !== false;
                      return (
                        <span key={ci} style={{ display: "contents" }}>
                          <label style={styles.videoUploadButton} title={ctrl.label ?? "Upload video"}>
                            <input
                              type="file"
                              accept="video/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = URL.createObjectURL(file);
                                updateScene(i, "backgroundVideo", {
                                  src: url,
                                  scale: 1.5,
                                  blendMode: "normal",
                                  startFrom: 0,
                                });
                              }}
                            />
                            {scene.backgroundVideo ? "🎬" : "+🎬"}
                          </label>
                          <button
                            type="button"
                            style={{
                              ...styles.videoUploadButton,
                              opacity: isMuted ? 0.5 : 1,
                            }}
                            title={isMuted ? "Unmute video" : "Mute video"}
                            onClick={() => {
                              const current = scene.backgroundVideo ?? { src: "", scale: 1.5, blendMode: "screen", startFrom: 0 };
                              updateScene(i, "backgroundVideo", { ...current, muted: !isMuted });
                            }}
                          >
                            {isMuted ? "🔇" : "🔊"}
                          </button>
                        </span>
                      );
                    }
                    return null;
                  })}
                  <input
                    style={styles.fontSizeInput}
                    type="number"
                    value={scene.fontSize ?? 200}
                    onChange={(e) =>
                      updateScene(i, "fontSize", Number(e.target.value))
                    }
                    title="Font size (px)"
                  />
                  <input
                    style={styles.durationInput}
                    type="number"
                    value={scene.duration ?? DEFAULT_SCENE_DURATION}
                    onChange={(e) =>
                      updateScene(i, "duration", Number(e.target.value))
                    }
                    title="Duration (seconds)"
                    min={1}
                    step={1}
                  />
                  {props.scenes.length > 1 && (
                    <button
                      style={styles.removeButton}
                      onClick={() => removeScene(i)}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}

            </div>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div style={styles.modalOverlay} onClick={() => setShowGallery(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>Scene Gallery</h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowGallery(false)}
              >
                x
              </button>
            </div>
            <div style={styles.modalBody}>
              {Object.entries(categories).map(([category, layouts]) => (
                <div key={category}>
                  <h3 style={styles.categoryHeading}>{category}</h3>
                  <div style={styles.galleryGrid}>
                    {layouts.map((opt) => (
                      <div key={opt.index} style={styles.galleryCard}>
                        <div style={styles.galleryPreview}>
                          <Thumbnail
                            component={HelloWorld}
                            inputProps={{
                              ...props,
                              showIntro: false,
                              showOutro: false,
                              scenes: [{ text: category, fontSize: 100, layout: opt.index }],
                            }}
                            durationInFrames={SCENE_DURATION}
                            fps={FPS}
                            compositionWidth={1080}
                            compositionHeight={1920}
                            frameToDisplay={60}
                            style={{ width: "100%", height: "100%", borderRadius: 8 }}
                          />
                        </div>
                        <span style={styles.galleryLabel}>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 20px",
    backgroundColor: "#0a0a0a",
    minHeight: "100vh",
    color: "#e2e8f0",
  },
  heading: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
    color: "#ffffff",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 32,
    alignItems: "start",
  },
  preview: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #1e293b",
  },
  recordingOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 9999,
    backgroundColor: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingPlayerWrap: {
    height: "100vh",
    aspectRatio: "9/16",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 24,
    borderRadius: 12,
    border: "1px solid #1e293b",
    backgroundColor: "#111118",
  },
  controlsHeading: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "#ffffff",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: "#94a3b8",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  styleRow: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  styleLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
    accentColor: "#94a3b8",
  },
  scenesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addButton: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
  scenesList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sceneRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  sceneNumber: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
    minWidth: 20,
    textAlign: "center" as const,
  },
  sceneFixedName: {
    flex: 1,
    padding: "8px 12px",
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: 500,
  },
  sceneInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  colorRow: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  colorLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  colorInput: {
    width: 48,
    height: 48,
    border: "1px solid #334155",
    borderRadius: 8,
    backgroundColor: "transparent",
    cursor: "pointer",
    padding: 2,
  },
  colorName: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "capitalize" as const,
  },
  colorHex: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
  },
  layoutSelect: {
    padding: "8px 6px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    minWidth: 0,
  },
  videoUploadButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  } as React.CSSProperties,
  fontSizeInput: {
    width: 56,
    padding: "8px 6px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 13,
    textAlign: "center" as const,
    outline: "none",
  },
  durationInput: {
    width: 44,
    padding: "8px 4px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 13,
    textAlign: "center" as const,
    outline: "none",
  },
  downloadButton: {
    marginTop: 12,
    padding: "12px 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#e2e8f0",
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  removeButton: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
  },
  customizeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  galleryButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#111118",
    border: "1px solid #1e293b",
    borderRadius: 12,
    width: 640,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e293b",
  },
  modalClose: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    padding: "4px 8px",
  },
  modalBody: {
    padding: 20,
    overflowY: "auto" as const,
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: 600,
    color: "#94a3b8",
    margin: "0 0 12px 0",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  galleryCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 6,
    cursor: "default",
  },
  galleryPreview: {
    width: "100%",
    aspectRatio: "9/16",
    borderRadius: 8,
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryIndex: {
    fontSize: 24,
    fontWeight: 700,
    color: "#334155",
  },
  galleryLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center" as const,
  },
};
