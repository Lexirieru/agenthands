"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Custom hook to detect navigation information
 *
 * @returns {Object} navigationInfo - Object containing:
 *   - currentPage: string - The current page (pathname)
 *   - navigationType: 'reload' | 'external' | 'back' | 'forward' | 'navigate' - Navigation type
 *   - previousPage: string | null - The previous page (pathname or null)
 */
/**
 * Normalizes the pathname by removing any hash/anchor
 * @param {string} path - The pathname to normalize
 * @returns {string} - The pathname without hash
 */
const normalizePathname = (path) => {
    if (!path) return path
    // Remove any hash/anchor (#...) from the pathname
    return path.split('#')[0]
}

export default function useNavigationDetection() {
    const rawPathname = usePathname()
    // Normalize the pathname to remove any hash/anchor
    const pathname = normalizePathname(rawPathname)
    const navigationHistoryRef = useRef([])
    const previousPathnameRef = useRef(null)
    const navigationStateRef = useRef({
        isInitialized: false,
        historyLength: 0,
        lastHistoryLength: 0,
        isPopState: false // Flag to detect popstate events
    })
    
    // State containing navigation information
    const [navigationInfo, setNavigationInfo] = useState({
        currentPage: null,
        navigationType: null, // 'reload' | 'external' | 'back' | 'forward' | 'navigate'
        previousPage: null
    })

    // Detect the initial navigation type (on first load)
    const detectInitialNavigationType = () => {
        if (typeof window === 'undefined' || typeof performance === 'undefined') {
            return 'navigate'
        }

        try {
            const navigationEntries = performance.getEntriesByType('navigation')
            if (navigationEntries.length > 0) {
                const navEntry = navigationEntries[0]
                // Navigation type according to PerformanceNavigationTiming
                if (navEntry.type === 'reload') {
                    return 'reload'
                } else if (navEntry.type === 'back_forward') {
                    // It's a back or forward, we'll detect it with the history
                    return 'back_forward'
                } else if (navEntry.type === 'navigate') {
                    // Can be external or internal
                    // If referrer is different from the origin, it's external
                    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
                        return 'external'
                    }
                    return 'navigate'
                }
            }
        } catch (e) {
            console.warn('Navigation detection error:', e)
        }

        // Fallback: check the referrer
        if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
            return 'external'
        }

        return 'navigate'
    }

    // Detect if it's a back or forward by comparing the history length
    const detectBackForward = () => {
        if (typeof window === 'undefined') return null
        
        const currentHistoryLength = window.history.length
        const state = navigationStateRef.current

        if (!state.isInitialized) {
            state.lastHistoryLength = currentHistoryLength
            state.historyLength = currentHistoryLength
            return null
        }

        // If the history length has decreased or stayed the same, it's probably a back
        // If it has increased, it's probably a forward (rare but possible)
        // In practice, we use the position in our internal history instead
        const currentIndex = navigationHistoryRef.current.indexOf(pathname)
        const previousIndex = navigationHistoryRef.current.indexOf(previousPathnameRef.current)

        if (currentIndex !== -1 && previousIndex !== -1) {
            if (currentIndex < previousIndex) {
                return 'back'
            } else if (currentIndex > previousIndex) {
                return 'forward'
            }
        }

        // If the history length has decreased, it's probably a back
        if (currentHistoryLength < state.lastHistoryLength) {
            return 'back'
        }

        return null
    }

    // Listen for popstate events to detect back/forward
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handlePopState = (event) => {
            navigationStateRef.current.isPopState = true
            // The pathname will be updated automatically by Next.js
        }

        window.addEventListener('popstate', handlePopState)
        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [])

    // Navigation detection logic
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Initialization on first load
        if (!navigationStateRef.current.isInitialized) {
            const initialType = detectInitialNavigationType()
            
            // If it's a back_forward detected by Performance API, we try to specify it
            let finalType = initialType
            if (initialType === 'back_forward') {
                // We can't really know on first load if it's back or forward
                // We'll update it on the next pathname change
                finalType = 'back_forward'
            }

            const referrerPath = document.referrer 
                ? normalizePathname(new URL(document.referrer).pathname)
                : null

            const initialInfo = {
                currentPage: pathname,
                navigationType: finalType,
                previousPage: referrerPath
            }
            setNavigationInfo(initialInfo)
            previousPathnameRef.current = pathname
            navigationHistoryRef.current = [pathname]
            navigationStateRef.current.isInitialized = true
            navigationStateRef.current.historyLength = window.history.length
            navigationStateRef.current.lastHistoryLength = window.history.length
            return
        }

        // Subsequent navigation
        if (previousPathnameRef.current !== pathname) {
            // previousPathnameRef.current contains the page we just left
            let previousPath = previousPathnameRef.current
            let navType = 'navigate'
            
            // If we detected a popstate, it's a back or forward
            if (navigationStateRef.current.isPopState) {
                const backForwardType = detectBackForward()
                navType = backForwardType || 'back' // Default to back if we can't determine
                navigationStateRef.current.isPopState = false // Reset the flag
            } else {
                // For subsequent navigations, performance.getEntriesByType('navigation')
                // always returns the initial entry, so we can't use it to detect a reload
                // A reload would be detected during initialization, not here
                // So if it's not a popstate, it's necessarily a normal navigation
                navType = 'navigate'
            }

            // Update the internal history and determine the previous page
            const currentIndex = navigationHistoryRef.current.indexOf(pathname)
            
            // If it's a back or forward, use the history to find the previous page
            if (navType === 'back' || navType === 'forward') {
                // previousPathnameRef.current contains the page we just left (it's the previous page)
                // But if it's null, we need to find it in the history
                if (!previousPath || previousPath === null) {
                    // Find the previous page in the history
                    if (currentIndex !== -1) {
                        if (navType === 'back' && currentIndex > 0) {
                            // For a back, the previous page is the one before in the history
                            previousPath = navigationHistoryRef.current[currentIndex - 1]
                        } else if (navType === 'forward' && currentIndex < navigationHistoryRef.current.length - 1) {
                            // For a forward, the previous page is the one after in the history
                            previousPath = navigationHistoryRef.current[currentIndex + 1]
                        } else {
                            // If we can't determine, use previousPathnameRef.current even if it's null
                            previousPath = previousPathnameRef.current
                        }
                    } else {
                        // If the current page is not in the history, use previousPathnameRef.current
                        previousPath = previousPathnameRef.current
                    }
                }
                // We're navigating in the history, we don't change the order
            } else if (currentIndex === -1) {
                // New page, add it to the history
                navigationHistoryRef.current.push(pathname)
            } else {
                // Normal navigation to a new page
                navigationHistoryRef.current.push(pathname)
            }

            const newInfo = {
                currentPage: pathname,
                navigationType: navType,
                previousPage: previousPath
            }
            setNavigationInfo(newInfo)
            previousPathnameRef.current = pathname
            navigationStateRef.current.lastHistoryLength = window.history.length
        }
    }, [pathname])

    return navigationInfo
}
