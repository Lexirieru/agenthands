"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import SwipeNav from "./SwipeNav";
import NavBar from "./NavBar";

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
