"use client"

import {useTexture} from "@react-three/drei";
import {useMemo, useRef, useEffect} from "react";
import {DoubleSide} from "three";
import * as THREE from 'three/webgpu'
import {uv, positionGeometry, time, texture, float, distance, log, rotate, oneMinus, uniform, Fn, sin, cos, vec2, dot, fract, mix, Loop, normalize, step, vec4, smoothstep, length } from 'three/tsl';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { useProjectCount, useProjectHomeActive } from "@/contexts/ProjectContext";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import styles from '@/app/page.module.css';
import { cleanupAnimations } from "@/utils/gsapHelpers";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigationInfo } from "@/contexts/NavigationContext";
import useMediaQuery from "@/hooks/useMediaQuery";
gsap.registerPlugin(ScrollTrigger);

const setupTimelines = (tlIn, tlOut, uniforms, ) => {
    tlIn = gsap.timeline({ scrollTrigger: {
        trigger: `.${styles.container}`,
        toggleActions: 'play reverse play reverse',
        start: '35% bottom',
        end: '40% bottom',
        scrub: true,
    }}).fromTo(uniforms.OPACITY, {value: 0}, {
        value: 1,
        duration: 4,
        ease: "linear"
    })

    tlOut = gsap.timeline({ scrollTrigger: {
        trigger: `.${styles.container}`,
        toggleActions: 'play reverse play reverse',
        start: '68% bottom',
        end: '69% bottom',
        scrub: true,
    }}).to(uniforms.OPACITY, {
        value: 0,
        duration: 4,
        ease: "linear"
    })
}


export default function ProjectImage(){
    const isMobile = useMediaQuery(768)  // < 768px
    const materialRef = useRef()
    const glassWallRef = useRef()
    const tlInRef = useRef(null)
    const tlOutRef = useRef(null)
    const count = useProjectCount()
    const homeActive = useProjectHomeActive()
    const navigationInfo = useNavigationInfo()
    const prevCountRef = useRef(count)
    const animRefs = useRef([null, null, null, null, null])

    const [proj1, proj2, proj3, proj4, proj5, proj6] = useTexture([
        "/images/p1.png",
        "/images/p2.png",
        "/images/p3.png",
        "/images/p4.png",
        "/images/p5.png",
        "/images/p6.png",
    ])
    // Restore original colors (sRGB) — without this WebGL treats JPEGs as linear
    ;[proj1, proj2, proj3, proj4, proj5, proj6].forEach((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
    })

    const uniforms = useMemo(() => {
        return {
            COUNT: uniform(count),
            OPACITY: uniform(0),
            // Individual transition per layer (0 -> 1 each)
            LAYER_T1: uniform(0),  // transition layer 1→2
            LAYER_T2: uniform(0),  // transition layer 2→3
            LAYER_T3: uniform(0),  // transition layer 3→4
            LAYER_T4: uniform(0),  // transition layer 4→5
            LAYER_T5: uniform(0),  // transition layer 5→6
            DIRECTION: uniform(1), // 1=forward, 0=backward
        }
    },[])

    useEffect(() => {
        uniforms.COUNT.value = count
        const dir = count - prevCountRef.current
        prevCountRef.current = count

        const layerUniforms = [uniforms.LAYER_T1, uniforms.LAYER_T2, uniforms.LAYER_T3, uniforms.LAYER_T4, uniforms.LAYER_T5]

        if (dir === 0) {
            // Initial mount or unchanged count: sync all layers
            // with the absolute count value (uniforms start at 0 on remount)
            layerUniforms.forEach((layer, i) => {
                layer.value = i < count - 1 ? 1 : 0
            })
            return
        }

        // DIRECTION must be 0 or 1, not -1 or 1
        uniforms.DIRECTION.value = dir > 0 ? 1 : 0

        if (Math.abs(dir) > 1) {
            // Non-incremental jump: kill all animations and position
            // all layers immediately to their correct state
            animRefs.current.forEach((anim) => anim?.kill())
            layerUniforms.forEach((layer, i) => {
                layer.value = i < count - 1 ? 1 : 0
            })
        } else {
            // Incremental (+-1): animate a single layer
            // Forward : LAYER_T[count-2] → 1 | Backward : LAYER_T[count-1] → 0
            const idx = dir === 1 ? count - 2 : count - 1
            const target = dir === 1 ? 1 : 0

            if(idx >= 0 && idx <= 4) {
                animRefs.current[idx]?.kill()
                animRefs.current[idx] = gsap.to(layerUniforms[idx], {
                    value: target,
                    duration: 1,
                    ease: "linear"
                })
            }
        }
    },[count])
    
    const cleanupTimelines = () => {
        if(tlInRef.current && tlOutRef.current){
            cleanupAnimations([
                { timeline: tlInRef.current, scrollTrigger: tlInRef.current.scrollTrigger },
                { timeline: tlOutRef.current, scrollTrigger: tlOutRef.current.scrollTrigger },
            ]);
        }
    }
    

    useGSAP(() => {
        if(navigationInfo.currentPage === "/"){
            setupTimelines(tlInRef.current, tlOutRef.current, uniforms)
        } else {
            cleanupTimelines()
        }

        return cleanupTimelines
    },[navigationInfo.currentPage])

    useEffect(() => {
        if(typeof homeActive === "string" && homeActive.includes("project")){
            gsap.to(uniforms.OPACITY, {value: 0, duration: 1, ease: "power2.out"})
        }
 
  
    },[homeActive])

    const grainTextureEffect = Fn(([_uv]) => {
        return fract(sin(dot(_uv, vec2(12.9898, 78.233))).mul(43758.5453123))
    })

    const transitionPattern = Fn(([c1, c2, c3, c4, c5, c6,uv_immutable]) => {
       // Wipe transition pattern
       const _grain = grainTextureEffect(uv_immutable).mul(0.2)

       
       const patternText = vec2(
            uv_immutable.x.add(sin(uv_immutable.y.mul(15.0)).mul(0.1)),
           uv_immutable.y.add(sin(uv_immutable.x.mul(15.0)).mul(0.1))
       );
       const patternText2 = smoothstep(0,1,distance(patternText, vec2(0)).mul(0.45)).add(_grain)
       const radialMask = (t) => oneMinus(step(
           t,
           patternText2
       ));

       // Directional mix
       const dirMix = (below, above, t, d) => {
           const fwdMask = radialMask(t);
           const bwdMask = radialMask(oneMinus(t));
           const fwd = mix(below, above, fwdMask);
           const bwd = mix(above, below, bwdMask);
           return mix(bwd, fwd, d);
       };

       // Stacking: each layer has its own progress AND its own direction
       const l1 = c1;
       const l2 = dirMix(l1, c2, uniforms.LAYER_T1, uniforms.DIRECTION);
       const l3 = dirMix(l2, c3, uniforms.LAYER_T2, uniforms.DIRECTION);
       const l4 = dirMix(l3, c4, uniforms.LAYER_T3, uniforms.DIRECTION);
       const l5 = dirMix(l4, c5, uniforms.LAYER_T4, uniforms.DIRECTION);
       const l6 = dirMix(l5, c6, uniforms.LAYER_T5, uniforms.DIRECTION);



        return l6
    })

    /**
     * Creates a chromatic aberration effect by separating RGB channels.
     * @param {Object} props - Effect parameters
     * @param {vec4} props.input - The input color texture from the scene
     * @param {number} [props.strength=0.01] - Strength of the aberration offset
     * @param {number} [props.radial=1.0] - Amount of radial distortion (0 = directional, 1 = radial from center)
     * @param {vec2} [props.direction=vec2(1,0)] - Direction of aberration when radial=0
     * @returns {vec4} The chromatic aberration processed color
     */
    const chromaticAberrationEffect = Fn((props) => {
        const {inputUV2, inputUV = uv , strength = 0.01, radial = 0.5, direction = vec2(0, 0) } = props || {}
    
        // We need to use the built-in uv() here to work as a post-processing effect
        const _uv = inputUV.toVar()

        const _strength = float(strength)
        const _radial = float(radial)
        const _direction = direction.toVar()
    
        // Calculate offset direction
        const center = vec2(0.5, 0.5).toVar()
        const toCenter = _uv.sub(center).toVar()
        const dist = length(toCenter).toVar()
    
        // Mix between directional and radial
        const radialDir = normalize(toCenter).toVar()
        const offsetDir = normalize(_direction.mul(float(1).sub(_radial)).add(radialDir.mul(_radial))).toVar()
    
        // Create different offsets for each channel
        const offset = offsetDir.mul(_strength).mul(dist.add(0.5)).add(inputUV2.r.mul(0.015)).toVar()
    
        const rOffset = _uv.add(offset.mul(1.0)).toVar()
        const gOffset = _uv.toVar()
        const bOffset = _uv.sub(offset.mul(1.0)).toVar()

        const chromatic = (tex) => vec4(texture(tex,rOffset).r, texture(tex,gOffset).g, texture(tex,bOffset).b, 1);
        const [c1, c2, c3, c4, c5, c6] = [proj1, proj2, proj3, proj4, proj5, proj6].map(chromatic);

        return transitionPattern(c1, c2, c3, c4, c5, c6,inputUV2)
    })

    const uvFlowField = Fn(([uv_immutable]) => {
        const _uv = vec2(uv_immutable).toVar();
        const radius = length(uv_immutable)
        const center = oneMinus(radius)
        const _time = time.mul(1);

        const amp1 = float(2.1)
        const amp2 = float(1.75)
        const _d = float(0.8)
        Loop({ start: 1, end: 2, type: 'float', condition: '<=' }, ({ i }) => {
            const strength = _d.mul(center).div(i)
            _uv.x.addAssign(strength.mul(sin(_time.add(_uv.y.mul(i)))).mul(amp1))
            _uv.y.addAssign(strength.mul(cos(_time.add(_uv.x.mul(i)))).mul(amp2))
        })

        const angle = log(length(_uv)).mul(0.2)
        _uv.assign(rotate(_uv, angle))

        return _uv
    })

    function fragmentMat(mat){
        const flowflied = uvFlowField(uv())

        const strengthbis = distance(uv().add(length(flowflied).mul(0.05)), vec2(0.5)).mul(float(uniforms.OPACITY).mul(0.35));

        const _grain = grainTextureEffect(flowflied).mul(0.05)

        const uvTest = flowflied.mul(0.05)

        // Retrieve the alpha from the original texture
        const blurredColor = gaussianBlur(chromaticAberrationEffect({inputUV2:flowflied,inputUV:uv().add(uvTest.mul(.25)), strength: 0.0025}).add(uvTest.mul(0.05)), null, isMobile ? 1 : 2)
        
        // Create the final vec4 with the alpha from the original texture
        const finalColor = vec4(blurredColor.rgb.mul(0.95), oneMinus(strengthbis).mul(uniforms.OPACITY))

        mat.colorNode = finalColor
        mat.positionNode = positionGeometry.add(length(uvTest))
    }

    const material = useMemo(() => {

        if(!materialRef.current){
            materialRef.current = new THREE.MeshBasicNodeMaterial({
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
             })
        }
        fragmentMat(materialRef.current)
        return materialRef.current;
    },[count, isMobile])

    return (
        <group>
            <mesh ref={glassWallRef} position={[0,0,1.5]}>
                <planeGeometry args={[1.66, 2.5,100,100]} />
                <primitive object={material} />
            </mesh>
        </group>
    )
}
