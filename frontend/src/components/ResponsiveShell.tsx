"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import SwipeNav from "./SwipeNav";
import NavBar from "./NavBar";

/**
 * Layout switcher between the mobile and desktop shells.
 *
 * Below the 768 px `md:` breakpoint (Celo MiniPay / phones): wraps children
 * in `SwipeNav` for horizontal gesture routing and renders `NavBar` at the bottom.
 * Above the breakpoint: renders a plain `<main>` flex container with no swipe or bottom nav.
 *
 * @since 1.0.0
 * @see SwipeNav — horizontal gesture routing for Celo MiniPay
 * @see NavBar — bottom tab bar for Celo mobile layout
 *
 * Must be a Client Component (`"use client"`) because it reads `useIsMobile`,
 * which depends on `matchMedia` — a browser-only API unavailable during Next.js SSR.
 */
export default function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <SwipeNav>{children}</SwipeNav>
        <NavBar />
      </>
    );
  }

  // Desktop (≥ 768 px): classic layout — no bottom nav, no swipe gesture routing
  return (
    <main className="flex-1">
      {children}
    </main>
  );
}
