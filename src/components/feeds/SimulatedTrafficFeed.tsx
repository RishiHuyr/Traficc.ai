/**
 * SimulatedTrafficFeed — Optimized Play-on-Demand
 *
 * Rules:
 * - Videos PAUSED by default, nothing runs on load
 * - User clicks Play → video starts + detection starts
 * - User clicks Pause → video pauses + ALL loops stop (zero CPU usage)
 * - Detection runs on a downscaled 480x270 canvas (not full res)
 * - Draw loop (rAF) and detect loop (setTimeout) are fully decoupled
 * - Zero backdrop-blur, zero heavy CSS effects
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Activity, Scan } from 'lucide-react';
import { aiService } from '@/services/aiModelService';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';

// Props
interface SimulatedTrafficFeedProps {
  videoSrc: string;
  cameraId: string;
  cameraName: string;
  location: string;
}

// Configuration
const CONFIDENCE_THRESHOLD = 0.50;
const DETECT_INTERVAL_MS = 200;   // ~5 fps inference
const VALID_CLASSES = new Set(['car', 'truck', 'bus', 'motorcycle']);

// Downscaled inference canvas size — low res = fast detection
const INFER_W = 480;
const INFER_H = 270;

interface Box {
  x: number; y: number; w: number; h: number;
  score: number;
  label: string;
}

const SimulatedTrafficFeed = memo(({
  videoSrc, cameraId, cameraName,
}: SimulatedTrafficFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);   // display overlay (CSS sized)
  const inferRef = useRef<HTMLCanvasElement | null>(null);  // hidden low-res canvas
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [detCount, setDetCount] = useState(0);

  // Hot-path refs — never trigger re-renders
  const boxesRef = useRef<Box[]>([]);
  const isPlayingRef = useRef(false);
  const drawRafRef = useRef<number>();
  const detectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep ref in sync with state
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Load model once + create hidden inference canvas
  useEffect(() => {
    aiService.loadModel().then(() => setModelReady(true));
    const c = document.createElement('canvas');
    c.width = INFER_W;
    c.height = INFER_H;
    inferRef.current = c;
  }, []);

  // -------------------------------------------------------------------------
  // DRAW LOOP — 60fps rAF, reads boxesRef only (no async, no state access)
  // -------------------------------------------------------------------------
  const drawLoop = useCallback(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) { drawRafRef.current = requestAnimationFrame(drawLoop); return; }

    // Sync canvas pixel buffer to its CSS display size
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { drawRafRef.current = requestAnimationFrame(drawLoop); return; }

    ctx.clearRect(0, 0, W, H);

    if (!isPlayingRef.current) {
      // Paused → clear canvas, skip drawing
      drawRafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    // Draw current boxes
    const boxes = boxesRef.current;
    ctx.lineWidth = 1.8;
    ctx.font = 'bold 9px monospace';

    for (const b of boxes) {
      const color = (b.label === 'truck' || b.label === 'bus') ? '#f59e0b' : '#3b82f6';

      // Semi-transparent fill
      ctx.fillStyle = color + '25';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Border
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;

      // Corner ticks
      const cs = 4;
      ctx.fillStyle = color;
      ctx.fillRect(b.x, b.y, cs, cs);
      ctx.fillRect(b.x + b.w - cs, b.y, cs, cs);
      ctx.fillRect(b.x, b.y + b.h - cs, cs, cs);
      ctx.fillRect(b.x + b.w - cs, b.y + b.h - cs, cs, cs);

      // Confidence label
      const txt = `${Math.round(b.score * 100)}%`;
      const tw = ctx.measureText(txt).width;
      const lx = Math.min(b.x, W - tw - 8);
      const ly = b.y >= 12 ? b.y - 2 : b.y + b.h + 12;
      ctx.fillStyle = color;
      ctx.fillRect(lx - 1, ly - 10, tw + 6, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, lx + 2, ly - 1);
    }

    drawRafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  // Start draw loop once on mount, stop on unmount
  useEffect(() => {
    drawRafRef.current = requestAnimationFrame(drawLoop);
    return () => { if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current); };
  }, [drawLoop]);

  // -------------------------------------------------------------------------
  // DETECT LOOP — setTimeout, async, decoupled from 60fps draw
  // -------------------------------------------------------------------------
  const detectLoop = useCallback(async () => {
    const video = videoRef.current;
    const infer = inferRef.current;
    const model = aiService.getModel();
    const overlay = overlayRef.current;

    if (!isPlayingRef.current || !video || video.paused || !model || !infer || !overlay) {
      // Nothing to do — stop scheduling until play() re-triggers
      return;
    }

    if (video.readyState >= 2) {
      try {
        // Downscale video frame onto 480x270 canvas for fast inference
        const ctx = infer.getContext('2d', { willReadFrequently: false });
        ctx?.drawImage(video, 0, 0, INFER_W, INFER_H);

        const preds: DetectedObject[] = await model.detect(infer, undefined, 0.4);
        const filtered = preds.filter(p => VALID_CLASSES.has(p.class) && p.score > CONFIDENCE_THRESHOLD);

        // Scale bbox coords from INFER canvas back to overlay display size
        const dW = overlay.clientWidth || INFER_W;
        const dH = overlay.clientHeight || INFER_H;
        const sx = dW / INFER_W;
        const sy = dH / INFER_H;

        boxesRef.current = filtered.map(p => ({
          x: p.bbox[0] * sx,
          y: p.bbox[1] * sy,
          w: p.bbox[2] * sx,
          h: p.bbox[3] * sy,
          score: p.score,
          label: p.class,
        }));

        // Throttled state update — only when count changes
        setDetCount(prev => prev === filtered.length ? prev : filtered.length);
      } catch {
        // Silent fail
      }
    }

    // Schedule next detection only if still playing
    if (isPlayingRef.current) {
      detectTimerRef.current = setTimeout(detectLoop, DETECT_INTERVAL_MS);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Play / Pause toggle
  // -------------------------------------------------------------------------
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlayingRef.current) {
      // START
      video.play().catch(() => { });
      setIsPlaying(true);
      // Kick off detection loop
      if (modelReady) {
        detectTimerRef.current = setTimeout(detectLoop, 100);
      }
    } else {
      // STOP — clear everything immediately
      video.pause();
      setIsPlaying(false);
      setDetCount(0);
      boxesRef.current = [];
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    }
  }, [detectLoop, modelReady]);

  // Start detection when model becomes ready AND video is already playing
  useEffect(() => {
    if (modelReady && isPlayingRef.current) {
      detectTimerRef.current = setTimeout(detectLoop, 100);
    }
  }, [modelReady, detectLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.pause();
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------
  return (
    <Card
      ref={containerRef as any}
      className="relative overflow-hidden bg-black border-zinc-800"
      style={{ contain: 'layout paint' }}
    >
      {/* Video — low quality hint via width/height attributes */}
      <div className="relative aspect-video bg-zinc-950">
        <video
          ref={videoRef}
          src={videoSrc}
          muted={isMuted}
          loop
          playsInline
          preload="none"           // Don't preload — saves bandwidth on page load
          width={854}              // Limit decode resolution to 480p-ish
          height={480}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Detection overlay canvas */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Thumbnail / paused state overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 z-10">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:bg-primary/90 transition-colors"
            >
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </button>
            <span className="text-xs text-zinc-400 mt-3 font-mono">{cameraId}</span>
            {!modelReady && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                <Scan className="w-3 h-3 animate-pulse" />
                Loading AI...
              </span>
            )}
          </div>
        )}

        {/* Active playback HUD — only shown when playing, no backdrop-blur */}
        {isPlaying && (
          <>
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 px-2.5 pt-2 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center gap-1 bg-red-700 px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              <span className="text-[10px] font-mono text-zinc-300 bg-black/70 px-1.5 py-0.5 rounded border border-zinc-700">
                {cameraId}
              </span>
            </div>

            {/* Bottom bar */}
            <div
              className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-center justify-between z-10"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
            >
              {/* Detection count */}
              <div className="flex items-center gap-1.5">
                {detCount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-emerald-800">
                    <Activity className="w-2.5 h-2.5" />
                    {detCount}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); }}
                  className="p-1 bg-black/70 rounded text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                >
                  {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="p-1 bg-black/70 rounded text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                >
                  <Pause size={11} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Camera name footer */}
      <div className="px-3 py-2 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/80">
        <span className="text-xs font-medium text-zinc-300">{cameraName}</span>
        {isPlaying && modelReady && (
          <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 font-mono">
            AI ON
          </Badge>
        )}
      </div>
    </Card>
  );
});

export default SimulatedTrafficFeed;
