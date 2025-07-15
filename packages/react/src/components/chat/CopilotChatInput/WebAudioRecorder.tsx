import {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

import type {
  AudioRecorderControls,
  AudioRecorderState,
  AudioRecorderComponent,
} from "../../../types/audio-recorder";
import { twMerge } from "tailwind-merge";

export const WebAudioRecorder: AudioRecorderComponent = forwardRef<
  AudioRecorderControls,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, ...divProps } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<AudioRecorderState>("idle");

  // Simple state management

  // Simplified loudness function - returns zeros for now
  const getLoudness = (n: number): number[] => {
    return new Array(n).fill(0);
  };

  // No setup needed - stub implementation

  // Canvas rendering with 60fps animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Update canvas dimensions if container resized
      if (
        canvas.width !== rect.width * dpr ||
        canvas.height !== rect.height * dpr
      ) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }

      // Configuration
      const barWidth = 2;
      const minHeight = 2;
      const maxHeight = 20;
      const gap = 2;
      const numSamples = Math.ceil(rect.width / (barWidth + gap));

      // Get loudness data
      const loudnessData = getLoudness(numSamples);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Get current foreground color
      const computedStyle = getComputedStyle(canvas);
      const currentForeground = computedStyle.color;

      // Draw bars
      ctx.fillStyle = currentForeground;
      const centerY = rect.height / 2;

      for (let i = 0; i < loudnessData.length; i++) {
        const sample = loudnessData[i] ?? 0;
        const barHeight = Math.round(
          sample * (maxHeight - minHeight) + minHeight
        );
        const x = Math.round(i * (barWidth + gap));
        const y = Math.round(centerY - barHeight / 2);

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Expose AudioRecorder API
  useImperativeHandle(
    ref,
    () => ({
      get state() {
        return state;
      },
      start: async () => {
        try {
          setState("recording");
          // Stub implementation - no actual recording
        } catch (error) {
          setState("idle");
          throw error;
        }
      },
      stop: () =>
        new Promise<Blob>((resolve, reject) => {
          if (state !== "recording") {
            return reject(new Error("Not recording"));
          }

          setState("processing");

          // Stub implementation - return empty blob
          const emptyBlob = new Blob([], { type: "audio/webm" });
          setState("idle");
          resolve(emptyBlob);
        }),
      dispose: () => {
        setState("idle");
      },
    }),
    [state]
  );

  return (
    <div className={twMerge("h-[44px] w-full px-5", className)} {...divProps}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
});

WebAudioRecorder.displayName = "WebAudioRecorder";
