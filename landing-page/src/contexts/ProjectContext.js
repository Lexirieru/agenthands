"use client"
import { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  // Store values in refs (does not trigger re-renders)
  const countRef = useRef(0)
  const projectHomeActiveRef = useRef(null) // 0 ou 1 au lieu de boolean
  
  // A single listener system for all changes
  const listenersRef = useRef(new Set())
  
  // Function to notify all listeners with the complete state
  const notifyListeners = useCallback(() => {
    const state = {
      count: countRef.current,
      projectHomeActive: projectHomeActiveRef.current
    }
    listenersRef.current.forEach(listener => listener(state))
  }, [])
  
  // Function to update count
  const setCount = useCallback((newCount) => {
    if (countRef.current !== newCount) {
      countRef.current = newCount
      notifyListeners()
    }
  }, [notifyListeners])
  
  // Function to update projectHomeActive
  const setProjectHomeActive = useCallback((newValue) => {
    if (projectHomeActiveRef.current !== newValue) {
      projectHomeActiveRef.current = newValue
      notifyListeners()
    }
  }, [notifyListeners])
  
  // Single function to subscribe to changes
  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener)
    // Return an unsubscribe function
    return () => listenersRef.current.delete(listener)
  }, [])
  
  // The context value NEVER changes (same reference)
  // So the Provider never re-renders because of the context
  const value = useRef({
    count: countRef.current,
    setCount,
    projectHomeActive: projectHomeActiveRef.current,
    setProjectHomeActive,
    subscribe,
    getCount: () => countRef.current, // To read the value without subscribing
    getProjectHomeActive: () => projectHomeActiveRef.current // To read the value without subscribing
  }).current
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

// Hook to read count (re-renders only if count changes)
export function useProjectCount() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectCount must be used within ProjectProvider')
  }
  
  // Local state that will be updated via subscription
  const [count, setCount] = useState(context.getCount())
  const countRef = useRef(count)
  
  useEffect(() => {
    countRef.current = count
  }, [count])
  
  useEffect(() => {
    // Subscribe to changes - only update if count changes
    const unsubscribe = context.subscribe((state) => {
      if (state.count !== countRef.current) {
        setCount(state.count)
      }
    })

    // Update with the current value in case it has changed
    setCount(context.getCount())
    
    return unsubscribe
  }, [context])
  
  return count
}

// Hook for setCount (NEVER re-renders)
export function useProjectSetCount() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectSetCount must be used within ProjectProvider')
  }
  return context.setCount
}

// Hook to read projectHomeActive (re-renders only if projectHomeActive changes)
export function useProjectHomeActive() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectHomeActive must be used within ProjectProvider')
  }
  
  // Local state that will be updated via subscription
  const [projectHomeActive, setProjectHomeActive] = useState(context.getProjectHomeActive())
  const projectHomeActiveRef = useRef(projectHomeActive)
  
  useEffect(() => {
    projectHomeActiveRef.current = projectHomeActive
  }, [projectHomeActive])
  
  useEffect(() => {
    // Subscribe to changes - only update if projectHomeActive changes
    const unsubscribe = context.subscribe((state) => {
      if (state.projectHomeActive !== projectHomeActiveRef.current) {
        setProjectHomeActive(state.projectHomeActive)
      }
    })

    // Update with the current value in case it has changed
    setProjectHomeActive(context.getProjectHomeActive())
    
    return unsubscribe
  }, [context])
  
  return projectHomeActive
}

// Hook for setProjectHomeActive (NEVER re-renders)
export function useProjectSetHomeActive() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectSetHomeActive must be used within ProjectProvider')
  }
  return context.setProjectHomeActive
}
