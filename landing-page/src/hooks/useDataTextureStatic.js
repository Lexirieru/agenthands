import {useMemo, useRef, useEffect, useCallback} from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export default function useDataTextureStatic(
    simulationSize = 256,
    uvClassic = false,
    radius = 0.075,
    decayFactor = 0.98,
    strength = 0.5,
    influenceGain = 1.3,
    influenceGamma = 1
){
    const {gl,size} = useThree()
    const simWidth = simulationSize
    const simHeight = simulationSize

    // Pointer tracking refs - updated without triggering re-renders
    const pointerVelocityRef = useRef({ x: 0, y: 0 })
    const pointerRef = useRef({ x: 0, y: 0 })
    const normalizedPointerRef = useRef({ x: 0, y: 0 })
    const dataTextureRef = useRef(null)
    const influenceScaleRef = useRef({ x: 1, y: 1 })
    const EPSILON_ASPECT = 1e-6

    const getCursorScales = useCallback((aspect) => {
        const safeAspect = Math.max(EPSILON_ASPECT, aspect || 1)
        return {
            // Match Refraction.js (592-598):
            // cursorCanonical = vec2(ndcX, ndcY / aspectSafe)
            x: 1,
            y: safeAspect
        }
    }, [EPSILON_ASPECT])

    // Single texture creation (no reallocation during resize)
    const createTexture = useCallback(() => {
        if (dataTextureRef.current) return dataTextureRef.current

        const data = new Float32Array(simWidth * simHeight * 4)
        for (let i = 0; i < simWidth * simHeight; i++) {
            const idx = i * 4
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 1.0
        }

        const newTexture = new THREE.DataTexture(
            data,
            simWidth,
            simHeight,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        newTexture.minFilter = THREE.NearestFilter
        newTexture.magFilter = THREE.NearestFilter
        newTexture.needsUpdate = true

        dataTextureRef.current = newTexture
        return newTexture
    }, [simHeight, simWidth])

    // Initial creation
    const dataTexture = useMemo(() => {
        return createTexture()
    }, [createTexture])

    // Reset the pointer center after canvas size change
    useEffect(() => {
        normalizedPointerRef.current.x = 0
        normalizedPointerRef.current.y = 0
        pointerRef.current.x = 0
        pointerRef.current.y = 0
        pointerVelocityRef.current.x = 0
        pointerVelocityRef.current.y = 0
    }, [size.width, size.height])

    function updateTexture(mousePosition){
        if(dataTexture){
            // mousePosition (R3F pointer) already arrives in NDC [-1, 1].
            const normalizedX = mousePosition.x
            const normalizedY = mousePosition.y

            // Align CPU interaction with shader sampling:
            // ndcX unchanged, ndcY divided by aspect.
            const aspect = size.width > 0 && size.height > 0
                ? size.width / size.height
                : 1
            const { x: scaleX, y: scaleY } = getCursorScales(aspect)
            influenceScaleRef.current.x = scaleX
            influenceScaleRef.current.y = scaleY

            normalizedPointerRef.current.x = Math.min(1, Math.max(-1, normalizedX / scaleX))
            normalizedPointerRef.current.y = Math.min(1, Math.max(-1, normalizedY / scaleY))
            frameUpdateFalloff()
        }
    }

    function frameUpdateFalloff(){
        const dt = dataTexture
        if (!dt) return
        if (!dt.image || !dt.image.data) return
        
        const data = dt.image.data
        const h = simHeight
        const aspect = size.width > 0 && size.height > 0
            ? size.width / size.height
            : 1
        
        // Update pointer velocity
        const pointerNormX = normalizedPointerRef.current.x
        const pointerNormY = normalizedPointerRef.current.y
        
        pointerVelocityRef.current.x = pointerNormX - pointerRef.current.x
        pointerVelocityRef.current.y = pointerNormY - pointerRef.current.y
        
        pointerRef.current.x = pointerNormX
        pointerRef.current.y = pointerNormY
        
        // Pre-calculations (outside loop)
        const { x: scaleX, y: scaleY } = getCursorScales(aspect)
        influenceScaleRef.current.x = scaleX
        influenceScaleRef.current.y = scaleY
        // Reference radius in "corrected view" space (constant circle on screen)
        const baseRadius = Math.max(1, simWidth * radius )
        // Radius in texture space (for the bounding box)
        const mouseRadiusX = Math.max(1, baseRadius  * scaleX/scaleY  )
        const mouseRadiusY = Math.max(1, baseRadius / scaleX/ scaleY  )

        const cellX = uvClassic
            ? pointerRef.current.x * simWidth
            : (1 + pointerRef.current.x) * 0.5 * simWidth
        const cellY = uvClassic
            ? pointerRef.current.y * h
            : (gl.backend?.isWebGLBackend ? 1 - pointerRef.current.y : 1 + pointerRef.current.y)  * 0.5 * h
        
        // Bounding box to limit the influence area
        const minX = Math.max(0, Math.floor(cellX - mouseRadiusX))
        const maxX = Math.min(simWidth, Math.ceil(cellX + mouseRadiusX ))
        const minY = Math.max(0, Math.floor(cellY - mouseRadiusY))
        const maxY = Math.min(h, Math.ceil(cellY + mouseRadiusY))
        
        // Isotropic metric derived directly from the radii (171-172),
        // to maintain a circle regardless of the aspect ratio.
        const isoScaleX = baseRadius / mouseRadiusX
        const isoScaleY = baseRadius / mouseRadiusY

        // Pre-calculate velocity in the same isotropic space as the radial distance.
        const vxGrid = pointerVelocityRef.current.x * isoScaleX * (simWidth / 2) 
        const vyGrid = -pointerVelocityRef.current.y * isoScaleY * (h / 2)
        const speedGrid = Math.hypot(vxGrid, vyGrid)
        const vxCurved = Math.sign(vxGrid) * Math.pow(Math.abs(vxGrid ), influenceGamma)
        const vyCurved = Math.sign(vyGrid) * Math.pow(Math.abs(vyGrid), influenceGamma)
        const speedCurved = Math.pow(speedGrid, influenceGamma)
        const len = Math.hypot(vxCurved, vyCurved) || 1
        const ndx = vxCurved / len
        const ndy = vyCurved / len
        
        // Single pass: decay + influence within the bounding box
        for (let y = 0; y < h; y++) {
            const rowOffset = y * simWidth * 4
            const inYRange = y >= minY && y < maxY
            
            for (let x = 0; x < simWidth; x++) {
                const idx = rowOffset + x * 4
                
                // Decay (always applied)
                data[idx] *= decayFactor
                data[idx + 1] *= decayFactor
                data[idx + 2] *= decayFactor
                
                // Influence (only within the bounding box)
                if (inYRange && x >= minX && x < maxX) {
                    const dx = cellX - (x + 0.5)
                    const dy = cellY - (y + 0.5)
                    // Isotropic distance normalized by X/Y radii (171-172).
                    // distSqNorm < 1 always defines a visual circle.
                    const dxIso = dx / mouseRadiusX
                    const dyIso = dy / mouseRadiusY
                    const distSqNorm = dxIso * dxIso + dyIso * dyIso
                    
                    if (distSqNorm < 1 && distSqNorm > 0) {
                        // A single sqrt instead of two
                        const force = Math.min(2, 1 / Math.sqrt(distSqNorm))
                        const scale = influenceGain * strength * force
                        const dispBase = scale * speedCurved
                        
                        data[idx] += dispBase * -ndx      // R: direction X (inverted)
                        data[idx + 1] += dispBase * ndy   // G: direction Y
                        data[idx + 2] += scale * speedCurved // B: speed magnitude
                    }
                }
            }
        }
        
        dt.needsUpdate = true
        
        // Decay pointer velocity
        pointerVelocityRef.current.x *= decayFactor
        pointerVelocityRef.current.y *= decayFactor
        const EPS = 1e-3
        if (Math.abs(pointerVelocityRef.current.x) < EPS) pointerVelocityRef.current.x = 0
        if (Math.abs(pointerVelocityRef.current.y) < EPS) pointerVelocityRef.current.y = 0
    }

    return {
        updateTexture,
        dataTexture
    }
}