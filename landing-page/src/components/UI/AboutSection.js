"use client"
import styles from '@/app/page.module.css';
import Clock from '@/components/UI/Clock/Clock';
import Meter from '@/components/UI/Meter';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateSplitTextChars, animateSplitTextWords, animateNav, cleanupAnimations } from '@/utils/gsapHelpers';
import Navigation from '@/components/UI/Navigation';
import useMediaQuery from "@/hooks/useMediaQuery"
import { useLenis } from 'lenis/react';
gsap.registerPlugin(ScrollTrigger);

export default function AboutSection() {
  const isMobile = useMediaQuery(768)  // < 768px
  const lenis = useLenis()

  useGSAP(() => {
    const navTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: `.${styles.about}`,
        toggleActions: 'play none reverse none',
        start: '-100% 50%',
        end: 'top 50%',
        scrub: true,
      }
    });

    const navResult = animateNav(`.${styles.about} nav ul`, null, {
      duration: 0.75,
      delay: 2,
      blur: 5,
      scaleYStart: isMobile ? 1 : 0.5,
      gapStart: isMobile ? "2.5rem" : "5rem",
      gapEnd: isMobile ? "3.25rem" : "5rem",
      ease: "linear",
      timeline: navTimeline
    });

    const splitTextChars = animateSplitTextChars(`.${styles.about} h2`, {
      duration: 2,
      delay: 0,
      staggerAmount: 0.75,
      blur: 20,
      ease: "power2.out",
      scrollTrigger: {
        trigger: `.${styles.about}`,
        toggleActions: 'play none none none',
        start: 'top 50%',
        end: 'top 50%',
      }
    });
    let splitTextPres = null;
    let splitTextAbout = null;
    if(!isMobile){

    splitTextPres = animateSplitTextWords(`.${styles.presentation}`, {
      trigger: `.${styles.presentation}`,
      toggleActions: 'play none none none',
      start: '-0% bottom',
      end: '100% 85%',
      scrub: true,
    }, {
      duration: 0.75,
      delay: 2,
      staggerAmount: 1,
      blur: 5
    });


      splitTextAbout = animateSplitTextWords(`.${styles.aboutContent} li p`, {
      trigger: `.${styles.aboutContent} ul`,
      toggleActions: 'play none none none',
      start: '-100% 80%',
      end: '80% 80%',
      scrub: true,
    }, {
      duration: 0.75,
      delay: 2,
      staggerAmount: 1,
      blur: 5
    });
  }
    return () => {
      cleanupAnimations([
        { timeline: navTimeline, scrollTrigger: navTimeline.scrollTrigger },
        splitTextChars,
        splitTextPres,
        splitTextAbout
      ]);
    };
  }, [isMobile])

  const handleClick = (id) => {
    lenis.scrollTo(`#${id}`)
  }

  return (
    <section className={styles.about} id="about">
      <Meter></Meter>

      <Navigation 
        variant="about" 
        selectedItem="ABOUT"
        customStyles={{ selected: styles.selected }}
        onItemClick={handleClick}
      />
      <h2>AGENTHANDS</h2>
      <div className={styles.lineContainer}>
        <span className={styles.middleLine} aria-hidden="true"></span>
      </div>
      <div className={styles.aboutContent}>
        <ul>
          <li>
            <h3>(+) TECH STACK</h3>
          </li>
          <li>
            <ul>
              <li>
                <p>- <strong>SMART CONTRACTS</strong> : SOLIDITY ;
                   FOUNDRY ; OPENZEPPELIN ; UUPS PROXY
                </p>
              </li>
            </ul>
          </li>
          <li>
            <ul>
              <li>
                <p>- <strong>FRONTEND & BACKEND</strong> : NEXT.JS ;
                  REACT ; WAGMI ; VIEM ; HONO ; BUN ; TANSTACK QUERY</p>
              </li>
            </ul>
          </li>
        </ul>
        <p className={styles.presentation}>
         AgentHands is a marketplace where AI agents post tasks for humans. Agents describe what needs doing — deliveries, inspections, pickups — and lock USDC as payment. Verified humans accept, do the work, upload proof photos to IPFS, and get paid. Built on Base and Celo with Self Protocol identity verification, ERC-8004 agent registry, and x402 API payments.
        </p>
      </div>
      <footer>
        <p className={styles.copyright}>
          <span> © </span> AGENTHANDS 2026
        </p>
        <p className={styles.designedBy}>[ BUILT FOR THE SYNTHESIS HACKATHON ]</p>
        <p className={styles.date}>
          <Clock />
        </p>
      </footer>
    </section>
  );
}
