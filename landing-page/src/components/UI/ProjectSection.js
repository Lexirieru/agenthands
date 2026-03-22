"use client"
import { gsap } from 'gsap';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import styles from '@/app/page.module.css';
import projectsData from '@/data/projects.json';
import { useProjectCount, useProjectSetCount, useProjectSetHomeActive } from '@/contexts/ProjectContext';
import { addFadeInOutBlur, createMultipleScrollTriggers, cleanupAnimations } from '@/utils/gsapHelpers';
import useMediaQuery from '@/hooks/useMediaQuery';

gsap.registerPlugin(ScrollTrigger);

export default function Marker() {
  const count = useProjectCount()
  const setCount = useProjectSetCount()
  const setProjectHomeActive = useProjectSetHomeActive()
  const prevCountRef = useRef(0);
  const animationKeyRef = useRef(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const infosRef = useRef(null);
  const markerTriggersRef = useRef([]);
  const isMobile = useMediaQuery(768)

  const currentProject = useMemo(() => {
    const projectId = count === 0 ? 1 : count;
    return projectsData.projects.find(p => p.id === projectId) || projectsData.projects[0];
  }, [count]);

  useEffect(() => {
    if (prevCountRef.current !== count && prevCountRef.current !== 0) {
      animationKeyRef.current += 1;
      setShouldAnimate(true);

      prevCountRef.current = count;

    } else if (prevCountRef.current !== count) {
      animationKeyRef.current += 1;
      setShouldAnimate(true);
      prevCountRef.current = count;
      const timer = setTimeout(() => setShouldAnimate(false), 400);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const animProject = useCallback(() => {

    const tlHead = gsap.timeline({ scrollTrigger: {
      trigger: `.${styles.container}`,
      toggleActions: 'play reverse play reverse',
      start: '35% bottom',
      end: '40% bottom',
      scrub: true,
    }});

    const tlInfos = gsap.timeline({ scrollTrigger: {
      trigger: `.${styles.container}`,
      toggleActions: 'play reverse play reverse',
      start: '36% bottom',
      end: '40% bottom',
      scrub: true,
    }});

    const tlHeadEnd = gsap.timeline({ scrollTrigger: {
      trigger: `.${styles.container}`,
      toggleActions: 'play reverse play reverse',
      start: '67% bottom',
      end: '69% bottom',
      scrub: true,
    }});

    const tlInfosEnd = gsap.timeline({ scrollTrigger: {
      trigger: `.${styles.container}`,
      toggleActions: 'play reverse play reverse',
      start: '68% bottom',
      end: '69% bottom',
      scrub: true,
      onLeave: () => {
        setProjectHomeActive(0)
      },
      onEnterBack: () => {
        setProjectHomeActive(1)
      }
    }});

    addFadeInOutBlur(tlHead);
    tlHead
      .fadeInBlur(`.${styles.nameProject}`, { x: -20 })
      .fadeInBlur(`.${styles.headStatic}`, { x: 20, position: "<+.15" })

    addFadeInOutBlur(tlInfos);
    tlInfos
      .fadeInBlur(`.${styles.infosContent}`, { x: -10, position: "<+.05" })
      .fadeInBlur(`.${styles.type}`, { x: 10, position: "<" })
      .fadeInBlur(`.${styles.projets} .${styles.counter}`, { x: 10, position: "<", scaleYBase: 0.25, scaleYEnd: 1 })

    addFadeInOutBlur(tlHeadEnd);
    tlHeadEnd
      .fadeOutBlur(`.${styles.nameProject}`, { x: -20 })
      .fadeOutBlur(`.${styles.headStatic}`, { x: 20, position: "<+.15" })

    addFadeInOutBlur(tlInfosEnd);
    tlInfosEnd
      .fadeOutBlur(`.${styles.infosContent}`, { x: -10, position: "<+.05" })
      .fadeOutBlur(`.${styles.type}`, { x: 10, position: "<" })
      .fadeOutBlur(`.${styles.projets} .${styles.counter}`, { x: 0, position: "<", scaleYBase: 1, scaleYEnd: 0.25 })

    return [tlHead, tlInfos, tlHeadEnd, tlInfosEnd];
  }, []);

  useGSAP(() => {
    const pinTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: `.${styles.projets}`,
        toggleActions: 'play reverse play reverse',
        start: isMobile ? 'top 6.75%' : 'top 15%',
        end: '580% bottom',
        pin: true,
      },
    });

    const [tlHead, tlInfos, tlHeadEnd, tlInfosEnd] = animProject();

    const markerTriggers = createMultipleScrollTriggers(
      `.${styles.container}`,
      [
        {
          start: '37% bottom',
          end: '37% bottom',
          events: {
            onEnter: () => { setCount(1) },
            onEnterBack: () => { setCount(1) }
          }
        },
        {
          start: '45% bottom',
          end: '45% bottom',
          events: {
            onEnter: () => { setCount(2) },
            onEnterBack: () => { setCount(2) },
            onLeaveBack: () => { setCount(1) }
          }
        },
        {
          start: '50% bottom',
          end: '50% bottom',
          events: {
            onEnter: () => { setCount(3) },
            onEnterBack: () => { setCount(3) },
            onLeaveBack: () => { setCount(2) }
          }
        },
        {
          start: '55% bottom',
          end: '55% bottom',
          events: {
            onEnter: () => { setCount(4) },
            onEnterBack: () => { setCount(4) },
            onLeaveBack: () => { setCount(3) }
          }
        },
        {
          start: '60% bottom',
          end: '60% bottom',
          events: {
            onEnter: () => { setCount(5) },
            onEnterBack: () => { setCount(5) },
            onLeaveBack: () => { setCount(4) }
          }
        },
        {
          start: '65% bottom',
          end: '65% bottom',
          events: {
            onEnter: () => { setCount(6) },
            onEnterBack: () => { setCount(6) },
            onLeaveBack: () => { setCount(5) }
          }
        }
      ]
    );
    markerTriggersRef.current = markerTriggers;

    return () => {
      markerTriggersRef.current = [];
      cleanupAnimations([
        { timeline: pinTimeline, scrollTrigger: pinTimeline.scrollTrigger },
        { timeline: tlHead, scrollTrigger: tlHead.scrollTrigger },
        { timeline: tlInfos, scrollTrigger: tlInfos.scrollTrigger },
        { timeline: tlHeadEnd, scrollTrigger: tlHeadEnd.scrollTrigger },
        { timeline: tlInfosEnd, scrollTrigger: tlInfosEnd.scrollTrigger },
        ...markerTriggers
      ]);
    };
  }, [isMobile]);

  return <>
  <p className={styles.nameProject}  > AGENTHANDS</p>
  <div className={styles.anchorWork} id="work"></div>

  <div className={styles.projets}>
    <div className={styles.headStatic}>
      <h2>FEATURES</h2>
    </div>
    <div className={styles.infos} ref={infosRef}>
      <div className={styles.infosContent}>
        <h3>{currentProject.title}</h3>
        <p className={styles.date}>{currentProject.date}</p>
        <p className={styles.client}>{currentProject.client}</p>
      </div>
      <p className={styles.type}>{currentProject.type}</p>
    </div>

    <div className={styles.counter}>
      [ 0<span
          className={`${styles.counterNumber} ${shouldAnimate ? styles.animate : ''}`}
          key={`count-${count}-${animationKeyRef.current}`}
        >
          {count}
        </span> / 06 ]
    </div>

  </div>
  </>
}
