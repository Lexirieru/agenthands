"use client"
import { useGSAP } from '@gsap/react';
import styles from '@/app/page.module.css';
import Clock from '@/components/UI/Clock/Clock';
import Meter from '@/components/UI/Meter';
import { animateSplitTextChars, animHomeBlur, cleanupAnimations } from '@/utils/gsapHelpers';

export default function HeroSection() {
  useGSAP(() => {
    const splitTextResult = animateSplitTextChars(`.${styles.hero} h1`, {
      duration: 0.75,
      delay: 2.5,
      staggerAmount: 1,
      blur: 20
    });

    const blur1 = animHomeBlur(`.${styles.hero} .${styles.pressure}`, 1.5, 3.25);
    const blur2 = animHomeBlur(`.${styles.hero} .${styles.date}`, 2.5, 3.25);
    const blur3 = animHomeBlur(`.${styles.scrollIndicator}`, 1.5, 3);

    return () => {
      cleanupAnimations([
        splitTextResult,
        { animation: blur1 },
        { animation: blur2 },
        { animation: blur3 }
      ]);
    };
  }, [])

  return (
    <section className={styles.hero} id="home">
      <div className={styles.scrollIndicator}>(X)  [ SCROLL ]</div>
      <span className={styles.middleLine} aria-hidden="true"></span>
      <h1>AGENTHANDS</h1>
      <div className={styles.pressure}>
        <Meter></Meter>
      </div>
      <div className={styles.date}>
        <Clock />
      </div>
    </section>
  );
}
