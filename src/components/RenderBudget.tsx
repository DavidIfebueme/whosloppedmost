"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRace } from "@/store/race";

declare global {
  interface Window {
    __raceMetrics?: {
      frameCount: number; fps: number; frameTimeMs: number; drawCalls: number;
      triangles: number; geometries: number; textures: number; dpr: number;
      paused: boolean; quality: string; camera: number[]; renderer: string;
    };
  }
}

/** One-way automatic downgrade avoids oscillating image quality on busy devices. */
export default function RenderBudget() {
  const enabled = useRef(false);
  const rendererName = useRef("");
  const totalFrames = useRef(0);
  const sample = useRef({ seconds: 0, frames: 0 });
  const warmup = useRef(0);
  const gl = useThree((s) => s.gl);
  const paused = useRace((s) => s.paused);
  const quality = useRace((s) => s.quality);
  useEffect(() => {
    enabled.current = new URLSearchParams(window.location.search).get("metrics") === "1";
    if (!enabled.current) return;
    const context = gl.getContext();
    const extension = context.getExtension("WEBGL_debug_renderer_info");
    rendererName.current = extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : "unreported";
    if (/swiftshader|software/i.test(rendererName.current) && useRace.getState().quality === "auto") {
      useRace.getState().setEconomy(true);
    }
    return () => { delete window.__raceMetrics; };
  }, [gl]);
  useEffect(() => {
    sample.current = { seconds: 0, frames: 0 };
    if (window.__raceMetrics) { window.__raceMetrics.paused = paused; window.__raceMetrics.quality = quality; }
  }, [paused, quality]);
  useFrame(({ camera }, delta) => {
    totalFrames.current++;
    if (document.hidden) return;
    if (paused) {
      if (enabled.current) window.__raceMetrics = {
        frameCount: totalFrames.current, fps: 0, frameTimeMs: 0,
        drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        dpr: gl.getPixelRatio(), paused, quality,
        camera: camera.position.toArray(), renderer: rendererName.current,
      };
      return;
    }
    warmup.current += delta;
    if (warmup.current < 2) return;
    sample.current.seconds += delta;
    sample.current.frames++;
    if (sample.current.seconds < 1) return;
    const fps = sample.current.frames / sample.current.seconds;
    const race = useRace.getState();
    if (warmup.current > 5 && quality === "auto" && fps < 35 && !race.economy) race.setEconomy(true);
    if (enabled.current) {
      window.__raceMetrics = {
        frameCount: totalFrames.current,
        fps: Math.round(fps * 10) / 10,
        frameTimeMs: Math.round(sample.current.seconds / sample.current.frames * 10000) / 10,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        dpr: gl.getPixelRatio(), paused, quality,
        camera: camera.position.toArray(), renderer: rendererName.current,
      };
    }
    sample.current = { seconds: 0, frames: 0 };
  });
  return null;
}
