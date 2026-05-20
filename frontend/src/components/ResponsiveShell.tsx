"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import SwipeNav from "./SwipeNav";
import NavBar from "./NavBar";

/**
 * Layout switcher between the mobile and desktop shells.
 *
 * Below the 768 px `md:` breakpoint (Celo MiniPay / phones): wraps children
 * in SwipeNav for horizontal gesture routing and renders NavBar at the bottom.
 * Above the breakpoint: renders a plain flex <main> with no swipe or bottom nav.
 *
 * Must be a Client Component because it reads `useIsMobile`, which depends on
 * `matchMedia` — a browser-only API.
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

  // Desktop: classic layout — no bottom nav, no swipe
  return (
    <main className="flex-1">
      {children}
    </main>
  );
}
