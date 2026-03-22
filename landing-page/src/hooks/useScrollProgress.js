import { useEffect, useRef, useCallback, useMemo } from "react";

// Minimal hook: progress (0..1), velocity (px/s signed), speed (px/s abs)
// Extras: optional onUpdate callback and SSR/no-scroll fallbackProgress
export default function useScrollProgress({ onUpdate, fallbackProgress = 0, scrollEventActive = true } = {}) {
    // Use refs to store values without triggering rerenders
    const progressRef = useRef(fallbackProgress);
    const velocityRef = useRef(0);
    const speedRef = useRef(0);

    const rafIdRef = useRef(null);
    const lastYRef = useRef(0);
    const lastTRef = useRef(0);

    const update = useCallback(() => {
        const doc = document.documentElement;
        const max = Math.max(0, doc.scrollHeight - window.innerHeight);
        const y = window.scrollY || 0;
        const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        progressRef.current = p;

        const now = performance.now();
        if (lastTRef.current) {
            const dt = (now - lastTRef.current) / 1000;
            if (dt > 0) {
                const v = (y - lastYRef.current) / dt;
                velocityRef.current = v;
                speedRef.current = Math.abs(v);
                if (typeof onUpdate === "function") {
                    onUpdate({ progress: p, velocity: v, speed: Math.abs(v) });
                }
            }
        } else if (typeof onUpdate === "function") {
            onUpdate({ progress: p, velocity: 0, speed: 0 });
        }

        lastTRef.current = now;
        lastYRef.current = y;
    }, [onUpdate]);

    useEffect(() => {
        if (typeof window === "undefined") {
            // SSR: allow consumer to still get notified with fallback once
            if (typeof onUpdate === "function") {
                onUpdate({ progress: fallbackProgress, velocity: 0, speed: 0 });
            }
            return;
        }

      

        const onScrollOrResize = () => {
            if (rafIdRef.current != null) return;
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                update();
            });
        };

        if (scrollEventActive) {
            update();
            window.addEventListener("scroll", onScrollOrResize, { passive: true });
            window.addEventListener("resize", onScrollOrResize, { passive: true });
        }
   
        return () => {
            if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
            window.removeEventListener("scroll", onScrollOrResize);
            window.removeEventListener("resize", onScrollOrResize);
        };
    }, [onUpdate, fallbackProgress]);

    // Return a stable object reference to avoid rerenders
    // Values are stored in refs and accessed via getters
    // update is memoized separately to keep the object stable
    const stableReturn = useMemo(() => ({
        get progress() { return progressRef.current; },
        get velocity() { return velocityRef.current; },
        get speed() { return speedRef.current; },
        update
    }), [update]);
    
    return stableReturn;
}

