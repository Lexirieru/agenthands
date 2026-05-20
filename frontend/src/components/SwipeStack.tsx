"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import SwipeCard from "./SwipeCard";
import type { TaskData } from "@/types/task";

/** Minimum vertical drag (px) or velocity required to trigger a card transition. */
const SWIPE_THRESHOLD = 80;

/**
 * Vertically-stacked full-screen task swiper for the Celo MiniPay mobile layout.
 *
 * Renders one task at a time using Framer Motion `AnimatePresence` with a
 * spring transition. Supports three interaction modes:
 *   1. Touch drag (Framer Motion `drag="y"`) — native mobile swipe
 *   2. Mouse wheel — `deltaY` accumulation with debounced idle reset
 *   3. `SwipeNav` button clicks (via `goTo` callback)
 *
 * A `canTransition` ref prevents multiple transitions from stacking while
 * the exit animation is still running.
 *
 * Consumed by the Celo mobile task-feed page (`/`) where workers browse
 * and accept tasks posted by AI agents on the AgentHands contract.
 */
export default function SwipeStack({
  tasks,
}: {
  tasks: readonly TaskData[];
}) {
  /** Zero-based index of the currently visible task card. */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** Last transition direction: positive = forward (down/next), negative = backward (up/prev). */
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  /** Guards against stacked transitions — set to false while an exit animation is running. */
  const canTransition = useRef(true);

  const safeIndex = tasks.length === 0 ? 0 : Math.min(currentIndex, tasks.length - 1);

  const goTo = useCallback(
    (dir: number) => {
      if (!canTransition.current) return;
      if (tasks.length === 0) return;
      canTransition.current = false;
      setDirection(dir);
      setCurrentIndex((prev) =>
        dir > 0
          ? (prev + 1) % tasks.length
          : (prev - 1 + tasks.length) % tasks.length,
      );
    },
    [tasks.length],
  );

  // Wheel scroll — one transition per gesture
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let accumulated = 0;
    let fired = false;
    let idleTimer: ReturnType<typeof setTimeout>;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        fired = false;
        accumulated = 0;
      }, 150);

      if (fired) return;

      accumulated += e.deltaY;

      if (Math.abs(accumulated) > 60) {
        goTo(accumulated > 0 ? 1 : -1);
        fired = true;
        accumulated = 0;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      clearTimeout(idleTimer);
    };
  }, [goTo]);

  if (!tasks.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8B4513]">
        No active tasks
      </div>
    );
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.y < -SWIPE_THRESHOLD || velocity.y < -300) {
      goTo(1);
    } else if (offset.y > SWIPE_THRESHOLD || velocity.y > 300) {
      goTo(-1);
    }
  };

  const variants = {
    enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0.5, scale: 0.95 }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0.5, scale: 0.95 }),
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      <AnimatePresence
        initial={false}
        custom={direction}
        mode="popLayout"
        onExitComplete={() => {
          canTransition.current = true;
        }}
      >
        {tasks[safeIndex] && (
          <motion.div
            key={safeIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 touch-pan-x"
          >
            <SwipeCard task={tasks[safeIndex]} index={safeIndex} total={tasks.length} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
