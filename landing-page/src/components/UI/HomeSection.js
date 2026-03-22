"use client"
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import styles from '@/app/page.module.css';
import Meter from '@/components/UI/Meter';
import { animateSplitTextWords, animateNav, animateBlurFadeIn, cleanupAnimations } from '@/utils/gsapHelpers';
import Navigation from '@/components/UI/Navigation';
import useMediaQuery from "@/hooks/useMediaQuery"
import { useLenis } from 'lenis/react';


gsap.registerPlugin(ScrollTrigger);

export default function HomeSection() {
  const isMobile = useMediaQuery(768)  // < 768px
  const lenis = useLenis()
  
  useGSAP(() => {
    let splitText1 = null;

    if (!isMobile) {
      splitText1 = animateSplitTextWords(`.${styles.home} h2`, {
        trigger: `.${styles.container}`,
        toggleActions: 'play none none none',
        start: '4.66% 50%',
        end: '8% 50%',
        scrub: true,
      }, {
        duration: 0.75,
        delay: 2,
        staggerAmount: 1,
        blur: 5
      });
    }

    let splitText2 = null;

    if(!isMobile){
      splitText2 = animateSplitTextWords(`.${styles.home} .${styles.pres} li`, {
        trigger: `.${styles.home} .${styles.pres}`,
        toggleActions: 'play none none none',
        start: '-50% bottom',
        end: '100% 65%',
        scrub: true,
      }, {
        duration: 0.75,
        delay: 2,
        staggerAmount: 1,
        blur: 5
      });
    }

    const navResult = animateNav(`.${styles.home} nav ul`, {
      trigger: `.${styles.container}`,
      toggleActions: 'play none none none',
      start: isMobile ? '5.5% 50%' : '7% 50%',
      end: isMobile ? '8% 50%' : '9% 50%',
      scrub: true,
    }, {
      duration: 0.75,
      delay: 2,
      blur: 5,
      scaleYStart: isMobile ? 1 : 0.5,
      gapStart: isMobile ? "2.5rem" : "4.5rem",
      gapEnd: isMobile ? "3.25rem" : "5rem",
      ease: "circ.out"
    });

    const blurFade = animateBlurFadeIn(`.${styles.home} .${styles.date}`, {
      trigger: `.${styles.container}`,
      toggleActions: 'play none none none',
      start: '4.66% 50%',
      end: '8% 50%',
    }, {
      duration: 0.75,
      delay: 2,
      blur: 5
    });

    return () => {
      cleanupAnimations([splitText1, splitText2, navResult, blurFade]);
    };
  }, [isMobile])

  const handleClick = (id) => {
    lenis.scrollTo(`#${id}`)
  }

  return (
    <section className={styles.home} id="contact">
      <h2>
        <span className={styles.marqueeTrack}>
          <span className={styles.marqueeContent}>AI agents post tasks, lock USDC as payment, and humans do the work. Upload proof, get paid — no middlemen involved. Running on Base and Celo.&nbsp;</span>
          <span className={styles.marqueeContent} aria-hidden="true">AI agents post tasks, lock USDC as payment, and humans do the work. Upload proof, get paid — no middlemen involved. Running on Base and Celo.&nbsp;</span>
        </span>
      </h2>
      <span className={styles.middleLine} aria-hidden="true"></span>
      <Navigation 
        variant={isMobile ? "homeMobile" : "home"} 
        selectedItem="HOME"
        customStyles={{ selected: styles.selected, date: styles.date }}
        onItemClick={handleClick}
      />
      <div className={styles.pres}>
        <ul>
          <li className={styles.titleMobile}>AGENTHANDS</li>
          <li>(+) CONTACT</li>
          <li >
            <ul className={styles.contact}>
              <li>- <a href="https://github.com/Lexirieru/agenthands" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li>- <a href="https://x.com/lexirieru" target="_blank" rel="noopener noreferrer">Twitter</a></li>
            </ul>
          </li>
          <li>(+) CHAINS</li>
          <li>
            <ul>
              <li>- BASE SEPOLIA (TESTNET)</li>
              <li>- CELO SEPOLIA (TESTNET)</li>
            </ul>
          </li>
          <li>(+) KEY INTEGRATIONS</li>
          <li>
            <ul>
              <li>- USDC PAYMENTS</li>
              <li>- SELF PROTOCOL (IDENTITY)</li>
              <li>- ERC-8004 AGENT IDENTITY</li>
              <li>- x402 MICROPAYMENTS</li>
            </ul>
          </li>
        </ul>
      </div>
      <Meter></Meter>
    </section>
  );
}
