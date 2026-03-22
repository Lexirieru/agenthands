"use client"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const LoaderContext = createContext(null)

// Minimum simulated loading time (in ms)
// The loader stays visible for at least this duration, even if everything is ready before
const MIN_LOADING_TIME = 2000

export function LoaderProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const minTimeReady = useRef(false)
  const sceneReady = useRef(false)

  const checkAndSetLoaded = useCallback(() => {
    if (minTimeReady.current && sceneReady.current) {
      setIsLoaded(true)
    }
  }, [])

  // Minimum simulated timer
  useEffect(() => {
    const timer = setTimeout(() => {
      minTimeReady.current = true
      checkAndSetLoaded()
    }, MIN_LOADING_TIME)
    return () => clearTimeout(timer)
  }, [checkAndSetLoaded])

  // Called from the Canvas when the 3D scene has rendered its first frames
  // (shaders compiled + textures loaded via useTexture Suspense)
  const setSceneReady = useCallback(() => {
    sceneReady.current = true
    checkAndSetLoaded()
  }, [checkAndSetLoaded])

  return (
    <LoaderContext.Provider value={{ isLoaded, setSceneReady }}>
      {children}
    </LoaderContext.Provider>
  )
}

// Full hook
export function useLoader() {
  const context = useContext(LoaderContext)
  if (!context) {
    throw new Error('useLoader must be used within LoaderProvider')
  }
  return context
}

// Read-only hook: true when loading is complete
export function useIsLoaded() {
  return useLoader().isLoaded
}

// Hook to signal that the 3D scene is ready (call from a component inside the Canvas)
export function useSetSceneReady() {
  return useLoader().setSceneReady
}
