/**
 * TopLoader – YouTube-style slim progress bar.
 *
 * Usage (imperative, from anywhere):
 *   import { topLoader } from './TopLoader';
 *   topLoader.start();
 *   topLoader.done();
 *
 * The bar is also auto-wired to axios interceptors in main.jsx.
 */
import { useEffect, useRef, useState } from 'react';

// ── Singleton controller ──────────────────────────────────────────────────────
let _start = () => {};
let _done  = () => {};
let _depth = 0; // track concurrent requests

export const topLoader = {
  start() {
    _depth++;
    _start();
  },
  done() {
    _depth = Math.max(0, _depth - 1);
    if (_depth === 0) _done();
  },
  /** Force-finish regardless of pending requests (e.g. on tab switch) */
  flush() {
    _depth = 0;
    _done();
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TopLoader() {
  const [visible, setVisible]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [finishing, setFinishing] = useState(false);

  const timerRef    = useRef(null);
  const progressRef = useRef(0);

  // Expose imperative controls to the singleton
  useEffect(() => {
    _start = () => {
      // Reset if somehow mid-flight
      clearInterval(timerRef.current);
      progressRef.current = 0;
      setProgress(0);
      setFinishing(false);
      setVisible(true);

      // Crawl forward quickly at first, then slow near 90 %
      timerRef.current = setInterval(() => {
        progressRef.current += progressRef.current < 30
          ? Math.random() * 8 + 4       // fast start
          : progressRef.current < 60
          ? Math.random() * 4 + 2       // medium
          : progressRef.current < 85
          ? Math.random() * 1.5 + 0.5   // slow crawl
          : 0;                          // stop at 85 % – wait for done()

        const capped = Math.min(progressRef.current, 85);
        setProgress(capped);
      }, 180);
    };

    _done = () => {
      clearInterval(timerRef.current);
      setFinishing(true);
      setProgress(100);

      // Hide after transition finishes
      setTimeout(() => {
        setVisible(false);
        setFinishing(false);
        setProgress(0);
        progressRef.current = 0;
      }, 500);
    };

    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* The bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          height: '3px',
          background: 'transparent',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #FF5A36, #FF8C42)',
            transition: finishing
              ? 'width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease'
              : 'width 0.2s ease-out',
            opacity: finishing && progress === 100 ? 0 : 1,
            boxShadow: '0 0 8px 2px rgba(255,90,54,0.6)',
            borderRadius: '0 2px 2px 0',
          }}
        />
        {/* Shimmer pulse at the tip */}
        {!finishing && (
          <div
            style={{
              position: 'absolute',
              top: '-1px',
              left: `calc(${progress}% - 60px)`,
              width: '60px',
              height: '5px',
              background:
                'linear-gradient(90deg, transparent, rgba(255,200,150,0.9), transparent)',
              borderRadius: '50%',
              filter: 'blur(2px)',
              animation: 'loaderPulse 0.9s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Keyframe for shimmer */}
      <style>{`
        @keyframes loaderPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
      `}</style>
    </>
  );
}
