"use client"

import { createContext, useContext } from "react"
import useNavigationDetection from "@/hooks/useNavigationDetection"

const NavigationContext = createContext(null)

/**
 * Provider that calls useNavigationDetection() only once
 * and shares the same value to all consuming components.
 */
export function NavigationProvider({ children }) {
  const navigationInfo = useNavigationDetection()

  return (
    <NavigationContext.Provider value={navigationInfo}>
      {children}
    </NavigationContext.Provider>
  )
}

/**
 * Hook to access shared navigation info.
 * Same value for all components that use it.
 *
 * @returns {Object} navigationInfo - { currentPage, navigationType, previousPage }
 */
export function useNavigationInfo() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigationInfo must be used within NavigationProvider")
  }
  return context
}
