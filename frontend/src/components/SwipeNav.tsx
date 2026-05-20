"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const tabs = ["/", "/search", "/dashboard"];

/**
 * Horizontal-swipe page navigation wrapper for the Celo MiniPay mobile shell.
 *
 * Listens for touch events on its container and translates horizontal swipes
 * into `router.push` calls across the three main tabs: `/` (Feed), `/search`
 * (Explore), `/dashboard`. Vertical swipes (used by `SwipeStack`) are not
 * intercepted — the lock axis is determined by the first 8 px of movement.
 *
 * `offset` creates a rubber-band drag effect; edge tabs resist with 0.15×
 * multiplier, interior transitions use 0.35×. On release, a 120 ms snap
 * animation completes before the route changes so the transition feels
 * physical on low-end Celo phones.
 */
export default function SwipeNav({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  /** X coordinate where the current touch gesture started, or null if no touch is active. */
  const startX = useRef<number | null>(null);
  /** Y coordinate where the current touch gesture started, used to disambiguate horizontal vs vertical. */
  const startY = useRef<number | null>(null);
  /** True once the gesture has been classified as horizontal (set after the first 8 px of movement). */
  const isHorizontal = useRef(false);
  /** Current translateX offset in pixels, creating a rubber-band drag effect during swipe. */
  const [offset, setOffset] = useState(0);
  /** True during the 120 ms snap animation that runs before the route transition fires. */
  const [snapping, setSnapping] = useState(false);

  // Map /tasks to / for tab matching
  const normalizedPath = pathname === "/tasks" ? "/" : pathname;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = false;
    setSnapping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);

    if (!isHorizontal.current) {
      if (Math.abs(dx) < 8 && dy < 8) return;
      if (dy > Math.abs(dx)) return;
      isHorizontal.current = true;
    }

    const idx = tabs.indexOf(normalizedPath);
    const atEdge = (dx > 0 && idx === 0) || (dx < 0 && idx === tabs.length - 1);
    setOffset(dx * (atEdge ? 0.15 : 0.35));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || !isHorizontal.current) {
      startX.current = null;
      startY.current = null;
      setOffset(0);
      return;
    }
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    startY.current = null;
    isHorizontal.current = false;

    const idx = tabs.indexOf(normalizedPath);
    setSnapping(true);

    if (Math.abs(dx) >= 50 && idx !== -1) {
      if (dx < 0 && idx < tabs.length - 1) {
        setOffset(-80);
        setTimeout(() => {
          router.push(tabs[idx + 1]);
          setOffset(0);
        }, 120);
        return;
      }
      if (dx > 0 && idx > 0) {
        setOffset(80);
        setTimeout(() => {
          router.push(tabs[idx - 1]);
          setOffset(0);
        }, 120);
        return;
      }
    }
    setOffset(0);
  };

  return (
    <main
      className="flex-1 flex flex-col max-w-md mx-auto w-full pb-16 overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: snapping ? "transform 0.18s ease-out" : "none",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </main>
  );
}
