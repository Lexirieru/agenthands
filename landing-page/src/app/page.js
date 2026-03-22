"use client"
import styles from "@/app/page.module.css";
import HeroSection from "@/components/UI/HeroSection";
import HomeSection from "@/components/UI/HomeSection";
import AboutSection from "@/components/UI/AboutSection";
import Marker from "@/components/UI/ProjectSection";
import { useNavigationInfo } from "@/contexts/NavigationContext";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function Home() {

  const navigationInfo = useNavigationInfo()
    useGSAP(() => {
      const navType = navigationInfo.navigationType

      if(navType === 'navigate'){
          gsap.fromTo(`.${styles.container}`, {
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
      <main className={styles.container}>
          <HeroSection />
          <HomeSection />
          <Marker />
          <AboutSection />
      </main>
  );
}
