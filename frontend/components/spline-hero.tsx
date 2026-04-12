'use client';

import type { Application } from '@splinetool/runtime';
import React, { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/cSfENQjU5HVsSvJg/scene.splinecode';

type WebGLContextCreationErrorEvent = Event & {
  statusMessage?: string;
};

function canCreateWebGLContext(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const probe = document.createElement('canvas');
    const attrs: WebGLContextAttributes = {
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    };
    const gl2 = probe.getContext('webgl2', attrs);
    if (gl2) {
      (gl2.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
      return true;
    }

    const gl = (probe.getContext('webgl', attrs) ??
      probe.getContext('experimental-webgl', attrs)) as WebGLRenderingContext | null;
    if (gl) {
      (gl.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function StaticFallback({ reason }: { reason?: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a1a] to-[#0d0820]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.35) 0%, transparent 70%)',
        }}
      />
      {reason ? (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm">
          3D hero unavailable: {reason}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Loads Spline via @splinetool/runtime with try/catch around the whole init path.
 * The stock <Spline> component constructs Application inside useEffect without try/catch;
 * when WebGL creation throws there, error boundaries do not catch it.
 */
function SafeSplineScene({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    const onContextCreationError = (event: Event) => {
      if (cancelled) return;
      const statusMessage = (event as WebGLContextCreationErrorEvent).statusMessage?.trim();
      setFallbackReason(statusMessage || 'WebGL is disabled in this browser');
      setFailed(true);
    };

    canvas.addEventListener('webglcontextcreationerror', onContextCreationError as EventListener);

    if (!canCreateWebGLContext()) {
      setFallbackReason('WebGL is disabled in this browser');
      setFailed(true);
      return () => {
        canvas.removeEventListener('webglcontextcreationerror', onContextCreationError as EventListener);
      };
    }

    void (async () => {
      try {
        const { Application } = await import('@splinetool/runtime');
        const app = new Application(canvas, { renderOnDemand: true });
        appRef.current = app;
        await app.load(SCENE_URL);
        if (cancelled) {
          try {
            app.dispose();
          } catch {
            /* ignore */
          }
          appRef.current = undefined;
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[SplineHero] WebGL / Spline failed, showing fallback.', e);
          setFallbackReason('Unable to initialize WebGL renderer');
          setFailed(true);
        }
        const a = appRef.current;
        if (a) {
          try {
            a.dispose();
          } catch {
            /* ignore */
          }
          appRef.current = undefined;
        }
      }
    })();

    return () => {
      cancelled = true;
      canvas.removeEventListener('webglcontextcreationerror', onContextCreationError as EventListener);
      const a = appRef.current;
      if (a) {
        try {
          a.dispose();
        } catch {
          /* ignore */
        }
        appRef.current = undefined;
      }
    };
  }, []);

  if (failed) {
    return <StaticFallback reason={fallbackReason} />;
  }

  return (
    <div className={`min-h-0 min-w-0 overflow-hidden ${className ?? ''}`}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

export default function SplineHero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    return <StaticFallback />;
  }

  return <SafeSplineScene className="h-full w-full" />;
}
