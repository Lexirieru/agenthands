"use client";

import { useState, useEffect } from "react";

/**
 * Return `true` when the viewport is narrower than `breakpoint` pixels.
 *
 * The default breakpoint (768 px) maps to Tailwind's `md:` class, which is
 * the boundary between the Celo mobile layout (SwipeStack + bottom NavBar)
 * and the desktop layout (TaskGrid + Header). This hook drives the split
 * in `Header` and `DollarsCard` that excludes volatile CELO balances from
 * the MiniPay/mobile surface.
 *
 * Uses `matchMedia` with a `change` listener so the value updates on window
 * resize without needing React state polling.
 *
 * @param breakpoint - Pixel width threshold (exclusive upper bound).
 * @returns `true` while the viewport is below `breakpoint` px; `false` otherwise.
 *   Initialises to `false` on SSR and updates synchronously in the first paint effect.
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile(); // true on < 768 px viewports
 * const isNarrow = useIsMobile(480); // true on < 480 px viewports
 * ```
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
