import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pomodoroPosition';
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;
const MARGIN = 8;

export interface Position {
  x: number;
  y: number;
}

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
  } catch {}
  return null;
}

function clamp(p: Position, w: number, h: number): Position {
  const maxX = window.innerWidth - w - MARGIN;
  const maxY = window.innerHeight - h - MARGIN;
  return {
    x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, maxX)),
    y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, maxY)),
  };
}

export function useLongPressDrag(elRef: React.RefObject<HTMLElement>) {
  // Always start fresh: clear any persisted position from a previous session
  // so the pill returns to its default spot on every reload / app open.
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startPtRef = useRef<{ x: number; y: number } | null>(null);
  const offsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const draggingRef = useRef(false);

  // Re-clamp on resize
  useEffect(() => {
    const onResize = () => {
      const el = elRef.current;
      if (!el || !position) return;
      const r = el.getBoundingClientRect();
      setPosition((p) => (p ? clamp(p, r.width, r.height) : p));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [elRef, position]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      // Don't start long-press on interactive controls
      if (target.closest('button, input, textarea, [role="button"], a, select')) {
        return;
      }
      const el = elRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      startPtRef.current = { x: e.clientX, y: e.clientY };
      offsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        draggingRef.current = true;
        setIsDragging(true);
        try {
          navigator.vibrate?.(30);
        } catch {}
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      }, LONG_PRESS_MS);
    },
    [elRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = elRef.current;
      if (!el) return;

      if (!draggingRef.current) {
        // Cancel long-press if finger moves
        const sp = startPtRef.current;
        if (sp) {
          const dx = e.clientX - sp.x;
          const dy = e.clientY - sp.y;
          if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearTimer();
        }
        return;
      }

      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const next = clamp(
        { x: e.clientX - offsetRef.current.dx, y: e.clientY - offsetRef.current.dy },
        rect.width,
        rect.height,
      );
      setPosition(next);
    },
    [elRef],
  );

  const endDrag = useCallback((e?: React.PointerEvent) => {
    clearTimer();
    startPtRef.current = null;
    if (draggingRef.current) {
      draggingRef.current = false;
      setIsDragging(false);
      const el = elRef.current;
      if (el && e) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {}
      }
      setPosition((p) => {
        if (p) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          } catch {}
        }
        return p;
      });
    }
  }, [elRef]);

  return {
    position,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
