"use client"

import { useState, useEffect } from "react"

/**
 * Indicates whether the WebGL 2 backend should be forced (WebGPU disabled).
 * Useful when WebGPU causes performance issues (Safari, Chrome/Chromium).
 * @returns {{ forceWebGL: boolean, ready: boolean }}
 */
export default function useForceWebGLBackend() {
  const [state, setState] = useState({ forceWebGL: false, ready: false })

  useEffect(() => {
    if (typeof navigator === "undefined") return
    const ua = navigator.userAgent
    const vendor = navigator.vendor ?? ""

    // WebGPU not available -> force WebGL
    const hasWebGPU = !!navigator.gpu

    const isSafari =
      (/^((?!chrome|android).)*safari/i.test(ua) && !/Chromium|CriOS/.test(ua)) ||
      /Apple/.test(vendor) ||
      (/Safari/.test(ua) && !/Chrome/.test(ua))

    const shouldForce = !hasWebGPU || !!isSafari

    setState({ forceWebGL: shouldForce, ready: true })
  }, [])

  return state
}
