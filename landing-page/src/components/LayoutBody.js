"use client"

import "@/lib/webgpu-polyfill";
import { Canvas, useFrame } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";
import Refraction from "@/components/shaders/GlobalShader";
import { ReactLenis, useLenis } from 'lenis/react'
import { useEffect, useState, useRef, startTransition } from 'react'
import useForceWebGLBackend from "@/hooks/useForceWebGLBackend";
import ProjectImage from "@/components/shaders/ProjectImage";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { useNavigationInfo } from "@/contexts/NavigationContext";
import { LoaderProvider, useIsLoaded, useSetSceneReady } from "@/contexts/LoaderContext";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import styles from "@/app/page.module.css";


// Detects when the 3D scene has rendered its first frames
// (= shaders compiled + textures loaded via useTexture Suspense)
function SceneReadyDetector() {
  const setSceneReady = useSetSceneReady()
  const frameCount = useRef(0)
  const signaled = useRef(false)

  useFrame(() => {
    if (!signaled.current) {
      frameCount.current++
      // Wait 2 frames: the 1st useFrame call precedes the render,
      // the 2nd frame guarantees the GPU pipeline is created
      if (frameCount.current >= 2) {
        signaled.current = true
        setSceneReady()
      }
    }
  })

  return null
}

// Full-screen HTML overlay — hides everything during initial loading
// The color matches bgColors[0] from the Refraction shader (#FDE7C5)
function Loader() {
  const isLoaded = useIsLoaded()
  const loaderRef = useRef(null)

  // When loaded: fade out the loader
  useEffect(() => {
    if (!isLoaded) return

    const tween = gsap.to(loaderRef.current, {
      opacity: 0,
      duration: 1,
      delay: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        if (loaderRef.current) {
          loaderRef.current.style.pointerEvents = 'none'
        }
      }
    })

    return () => tween.kill()
  }, [isLoaded])

  return (
    <div className={styles.loader} ref={loaderRef}>
        <span className={styles.middleLine}></span>
       <div className={styles.loaderContent}>  
        <div className={styles.loaderText}>
          <span>LOADING <span className={styles.loaderDots}><span className={styles.dot}>.</span><span className={styles.dot}>.</span><span className={styles.dot}>.</span></span></span>
         </div>
      </div>
    </div>
  )
}

export default function LayoutBody({ children }) {
  const { forceWebGL, ready } = useForceWebGLBackend()
  const [canvasDeferred, setCanvasDeferred] = useState(false)

  // Defer the Canvas mount to let HTML/CSS paint
  // before WebGPU shader compilation blocks the main thread.
  // Double RAF: frame 1 = React commit, frame 2 = browser paint.
  // startTransition marks the mount as non-urgent.
  useEffect(() => {
    if (ready) {
      let rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          startTransition(() => setCanvasDeferred(true))
        })
      })
      return () => cancelAnimationFrame(rafId)
    }
  }, [ready])
  const lenis = useLenis()


  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const navigationInfo = useNavigationInfo()
  const previousPageRef = useRef(navigationInfo.currentPage)
  
  // Reset scroll and recalculate Lenis dimensions on page changes
  // Based on Lenis docs: autoResize uses ResizeObserver but doesn't always
  // catch SPA content changes, so we call resize() manually
  useEffect(() => {
    if (!lenis) return
    
    const fromProjectPage = previousPageRef.current?.includes('project')
    const toProjectPage = navigationInfo.currentPage?.includes('project')
    const pageChanged = previousPageRef.current !== navigationInfo.currentPage
    
    previousPageRef.current = navigationInfo.currentPage
    
    if (!pageChanged) return
    
    // Immediate scroll reset
    lenis.scrollTo(0, { immediate: true })
    
    // Double RAF to guarantee the DOM is rendered (standard technique)
    // Frame 1: React has committed the changes
    // Frame 2: The browser has painted the new content
    let rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        lenis.resize()
        
        // Handle the hash if present (e.g.: /#work)
        const hash = window.location.hash?.substring(1)
        if (!toProjectPage && hash) {
          const element = document.getElementById(hash)
          if (element) {
            lenis.scrollTo(element, { offset: 0 })
          }
        }
      })
    })
    
    return () => cancelAnimationFrame(rafId)
  }, [lenis, navigationInfo.currentPage])
  useGSAP(() => {
    const navType = navigationInfo.navigationType

    const containerEl = document.querySelector(`.${styles.container}`)
    if(navType === 'navigate' && containerEl){
        gsap.fromTo(containerEl, {
          opacity: 0,
        }, {
            opacity: 1,
            duration: 2,
            ease: "power3.out",
            delay: 1,
        })
    }

},[navigationInfo.navigationType,navigationInfo.currentPage,navigationInfo.previousPage])

  return (
    <LoaderProvider>
      <ProjectProvider>
        <ReactLenis root options={{ duration: 2}}/>
        <div className={styles.canvasContainer}>
        {ready && canvasDeferred && (
          <Canvas 
            style={{position: "fixed", top: 0, left: 0, width: "100dvw", height: "100lvh", background: "black", zIndex: 0, contain: "strict"}}
            gl={async (props) => {
              const renderer = new WebGPURenderer({
                ...props,
                forceWebGL,
                powerPreference: 'high-performance',
              })
              await renderer.init()
              return renderer
            }}
            dpr={1.25}
          >
            <SceneReadyDetector />
            <Refraction />
             <ProjectImage/>
           </Canvas>
        )}
        <Loader />
        <span className={styles.lateralBar}></span>  
        {children}
        </div>
      </ProjectProvider>
    </LoaderProvider>
  )
}
