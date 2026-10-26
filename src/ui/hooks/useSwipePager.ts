/**
 * Horizontal swipe paging for a screen that steps through a sequence (weeks, days): the touch
 * handlers, the drag/enter slide and the arrow-key fallback. It knows nothing about *what* is
 * paged — the caller maps a direction to its own next/previous page and hands over `pageKey`, the
 * value that changes when a page does, so the new page slides in from the side it was swiped to.
 */
import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion, type MotionValue } from "framer-motion";

const SWIPE_THRESHOLD_PX = 56;
/** Touches starting this close to a screen edge belong to the OS back gesture, not to paging. */
const EDGE_GUARD_PX = 24;

type Direction = 1 | -1;

type SwipePager = {
  /** Spread onto the element that receives the gesture. */
  gesture: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  /** Motion values for the element that slides (`<motion.div style={slide}>`). */
  slide: { x: MotionValue<number>; opacity: MotionValue<number> };
  dragging: boolean;
};

export const useSwipePager = (pageKey: string, onPage: (dir: Direction) => void): SwipePager => {
  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const enterDir = useRef<Direction>(1);
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    /* Reduced motion keeps the change legible as a brief cross-fade instead of a slide. */
    x.set(reduceMotion ? 0 : enterDir.current * 16);
    opacity.set(reduceMotion ? 0.35 : 1);

    const controls = [
      animate(x, 0, { duration: reduceMotion ? 0.001 : 0.24, ease: [0.2, 0.8, 0.2, 1] }),
      animate(opacity, 1, { duration: reduceMotion ? 0.18 : 0.001, ease: [0.2, 0.8, 0.2, 1] }),
    ];

    return () => {
      controls.forEach((c) => {
        c.stop();
      });
    };
  }, [pageKey, reduceMotion, x, opacity]);

  const page = (dir: Direction) => {
    enterDir.current = dir;
    x.set(0);
    onPage(dir);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;

    const nearEdge =
      touch.clientX < EDGE_GUARD_PX || touch.clientX > window.innerWidth - EDGE_GUARD_PX;

    touchStart.current = nearEdge ? null : { x: touch.clientX, y: touch.clientY, axis: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    /* The first meaningful movement decides the gesture; a vertical scroll never turns into a swipe. */
    if (start.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      start.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      if (start.axis === "x") setDragging(true);
    }

    if (start.axis !== "x") return;

    x.set(dx);
  };

  const onTouchEnd = () => {
    const started = touchStart.current?.axis === "x";
    touchStart.current = null;
    setDragging(false);

    const dx = started ? x.get() : 0;

    if (started && dx <= -SWIPE_THRESHOLD_PX) {
      page(1);
      return;
    }

    if (started && dx >= SWIPE_THRESHOLD_PX) {
      page(-1);
      return;
    }

    animate(x, 0, { duration: reduceMotion ? 0.001 : 0.2, ease: [0.2, 0.8, 0.2, 1] });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    /* Arrow keys inside a child control (date picker, buttons) belong to that control. */
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") page(1);
    else if (e.key === "ArrowLeft") page(-1);
  };

  return {
    gesture: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd, onKeyDown },
    slide: { x, opacity },
    dragging,
  };
};
