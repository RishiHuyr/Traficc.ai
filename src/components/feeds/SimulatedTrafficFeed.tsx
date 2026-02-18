import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Video,
  Volume2,
  VolumeX,
  Cpu,
  Car,
  Activity,
  Scan
} from 'lucide-react';
import { aiService } from '@/services/aiModelService';
import { DetectedObject } from '@tensorflow-models/coco-ssd';

// Props Interface
interface SimulatedTrafficFeedProps {
  videoSrc: string;
  cameraId: string;
  cameraName: string;
  location: string;
}

// Configuration
const CONFIDENCE_THRESHOLD = 0.55;
const DETECTION_INTERVAL_MS = 250; // Throttled to 4 FPS for performance
const VALID_CLASSES = ['car', 'truck', 'bus', 'motorcycle'];

const SimulatedTrafficFeed = memo(({
  videoSrc,
  cameraId,
  cameraName,
  location
}: SimulatedTrafficFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI State (kept minimal)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0); // Update this rarely

  // Mutable Refs (No Re-renders)
  const lastDetectTimeRef = useRef(0);
  const detectionsRef = useRef<DetectedObject[]>([]);
  const isVisibleRef = useRef(false);
  const requestRef = useRef<number>();
  const drawRef = useRef<number>();

  // Load Model
  useEffect(() => {
    aiService.loadModel().then(() => setIsModelReady(true));
  }, []);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        isVisibleRef.current = visible;

        if (visible) {
          videoRef.current?.play().catch(() => { });
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.1 } // 10% visibility to trigger
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Canvas Drawing Loop (Syncs with Screen Refresh)
  const drawFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw Detections
    const detections = detectionsRef.current;

    // Batch styles
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';

    for (let i = 0; i < detections.length; i++) {
      const { bbox, score, class: label } = detections[i];
      const [x, y, w, h] = bbox;

      // Scale coordinates to canvas size (if video is scaled)
      // Assuming canvas matches video resolution 1:1 for simplicity in this optimization

      // Box
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();

      // Label bg
      const text = `${Math.round(score * 100)}%`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y - 14, textWidth + 6, 14);

      // Label text
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x + 3, y - 3);
      ctx.restore();
    }

    drawRef.current = requestAnimationFrame(drawFrame);
  }, []);

  // Detection Loop (Throttled)
  const detectFrame = useCallback(async () => {
    // Check constraints
    if (!isVisibleRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    // Throttle
    const now = performance.now();
    if (now - lastDetectTimeRef.current < DETECTION_INTERVAL_MS) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const model = aiService.getModel();
    if (!model || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      lastDetectTimeRef.current = now;

      const predictions = await model.detect(videoRef.current, undefined, 0.4);

      // Filter
      detectionsRef.current = predictions.filter(p =>
        VALID_CLASSES.includes(p.class) && p.score > CONFIDENCE_THRESHOLD
      );

      // Update count for UI (debounced to avoid flicker, or just raw)
      // Only update state if count changed significantly to avoid re-renders
      // For strict performance, we might skip this or throttle it purely
      if (Math.abs(detectionsRef.current.length - detectionCount) > 0) {
        setDetectionCount(detectionsRef.current.length);
      }

    } catch (e) {
      // Silent fail
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  }, [detectionCount]); // Dependency needed for checking count diff

  // Lifecycle for Loops
  useEffect(() => {
    // Start Loops
    requestRef.current = requestAnimationFrame(detectFrame);
    drawRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (drawRef.current) cancelAnimationFrame(drawRef.current);
    };
  }, [detectFrame, drawFrame]);

  // Handle Resize for Canvas
  const handleLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  };

  return (
    <Card ref={containerRef} className="relative overflow-hidden bg-black border-zinc-900 shadow-lg translate-z-0">

      {/* Video Layer */}
      <div className="relative aspect-video bg-zinc-950">
        <video
          ref={videoRef}
          src={videoSrc}
          muted={isMuted}
          loop
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-cover pointer-events-none"
          style={{ willChange: 'transform' }} // Hint for compositor
        />

        {/* Canvas Layer - Absolute on Top */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Loading State */}
        {!isModelReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm z-20">
            <Scan className="w-8 h-8 text-primary animate-pulse" />
          </div>
        )}
      </div>

      {/* Static UI Layer */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 border-zinc-700 bg-black/60 text-zinc-300 backdrop-blur-md">
            {cameraId}
          </Badge>
          {isModelReady && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono bg-black/40 px-1.5 rounded border border-emerald-500/20 backdrop-blur-md">
              <Activity className="w-3 h-3" />
              <span>{detectionCount}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-zinc-200">{cameraName}</div>
        </div>
      </div>

      {/* Playback Controls (Only interactive part) */}
      <div className='absolute top-2 right-2 z-30 opacity-0 hover:opacity-100 transition-opacity duration-200'>
        <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 bg-black/60 rounded-full text-white/80 hover:text-white backdrop-blur-md">
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

    </Card>
  );
});

export default SimulatedTrafficFeed;
