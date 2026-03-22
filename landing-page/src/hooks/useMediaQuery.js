"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect if the screen width is below a given threshold.
 * Useful for detecting mobile/tablet/desktop.
 *
 * @param {number} breakpoint - Threshold width in pixels (default: 768px for mobile)
 * @returns {boolean} - true if the width is below the threshold, false otherwise
 *
 * @example
 * const isMobile = useMediaQuery(768)
 * const isTablet = useMediaQuery(1024)
 * const isSmallScreen = useMediaQuery(480)
 */
export default function useMediaQuery(breakpoint = 768) {
  const [isBelowBreakpoint, setIsBelowBreakpoint] = useState(() => {
    // SSR: return false by default, will be updated on client-side mount
    if (typeof window === "undefined") {
      return false
    }
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    // Function to update the state
    const updateMatch = () => {
      setIsBelowBreakpoint(window.innerWidth < breakpoint)
    }

    // Update immediately on mount (in case the SSR value was incorrect)
    updateMatch()

    // Listen for size changes
    window.addEventListener("resize", updateMatch, { passive: true })

    return () => {
      window.removeEventListener("resize", updateMatch)
    }
  }, [breakpoint])

  return isBelowBreakpoint
}
