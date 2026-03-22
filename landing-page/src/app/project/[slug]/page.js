"use client"
import { use, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import projectsData from '@/data/projects.json'
import { findProjectBySlug } from '@/utils/slug'
import styles from './page.module.css'
import Clock from '@/components/UI/Clock/Clock'
import { useGSAP } from '@gsap/react';
import { gsap } from "gsap";
import { useProjectSetHomeActive, useProjectSetCount, useProjectCount } from '@/contexts/ProjectContext';
import Navigation from '@/components/UI/Navigation';
import { animateNav, animateSplitTextChars, addFadeInOutBlur } from '@/utils/gsapHelpers';
import { useNavigationInfo } from "@/contexts/NavigationContext";
import useMediaQuery from "@/hooks/useMediaQuery"
import Image from 'next/image'
export default function ProjectPage({ params }) {
  const isMobile = useMediaQuery(768)  // < 768px
  const { slug } = use(params)
  const router = useRouter()
  const setProjectHomeActive = useProjectSetHomeActive()
  const project = findProjectBySlug(slug, projectsData.projects)
  const setCount = useProjectSetCount()
  const count = useProjectCount()
  const haveBeenAnimate = useRef(false)
  const isRedirectingRef = useRef(false)
  const isAnimatingOut = useRef(false)
  const tl = useRef(null)
  const tlImages = useRef(null)
  const tlOut = useRef(null)
  const tlOutImages = useRef(null)
  const navigationInfo = useNavigationInfo()
  const {contextSafe} = useGSAP()

  function killAllTimelines() {
    tl.current?.kill()
    tlImages.current?.kill()
    tlOut.current?.kill()
    tlOutImages.current?.kill()
  }

  const animationIn = contextSafe((delay = 2.5) => {

    tl.current = gsap.timeline();
    tl.current.fromTo(`.${styles.projectContent} .${styles.middleLineContainer}`, {
      width: "0%",
    }, {
      delay: delay,
      width: "100%",
      duration: 1.5,
      ease: "power3.out",
    });
    animateNav(`.${styles.projectContent} nav ul`, null, {
      duration: 0.75,
      blur: 5,
      scaleYStart: 1,
      gapStart: isMobile ? "2.5rem" : "5rem",
      gapEnd: isMobile ? "3.25rem" : "5rem",
      delay: 0,
      ease: "linear",
      timeline: tl.current,
      position: "<+.15",
    });

    gsap.set(`.${styles.projectDetails} h1`, { opacity: 1 });

    animateSplitTextChars(`.${styles.projectDetails} h1`, {
      duration: 2,
      delay: 0,
      staggerAmount: 0.75,
      blur: 20,
      ease: "power2.out",
      timeline: tl.current,
      position: "<+.15",
    });
    tl.current.fromTo(`.${styles.projectDescription}`, {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 3,
      ease: "power2.out",
    },">-2")
    .fromTo(`.${styles.date}`, {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 2,
      ease: "power2.out",
    },"<")
    .fromTo(`.${styles.buttonContainer}`, {
      opacity: 0,
      filter: 'blur(5px)',
    }, {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 2,
      ease: "power2.out",
    },"<+.15")
    .fromTo(`.${styles.buttonContainer}`, {
      width: '0%',
    }, {
      width: 'auto',
      duration: .33,
      ease: "power2.out",
    }, "<+.25")
    .fromTo(`.${styles.buttonContainer} button span`, {
      transform: 'translateY(-100%)',
    }, {
      transform: 'translateY(0%)',
      duration: .5,
      ease: "power2.out",
    }, "<+.35");

    tlImages.current = gsap.timeline();
    tlImages.current.fromTo(`.${styles.projectImages} .${styles.middleLineContainer}`, {
      width: "0%",
    }, {
      width: isMobile ? "100vw" : "100%",
      duration: 1.5,
      delay: delay,
      ease: "power3.out",
    });

    addFadeInOutBlur(tlImages.current);
    tlImages.current
    .fadeInBlur(`.${styles.projectImages} .${styles.head}`, { x: 20,duration:1,position: "<+.15" })
    .fadeInBlur(`.${styles.projectImages} .${styles.imagesNumber}`, { x: 20,duration:1,position: "<+.25" })
    .fromTo(`.${styles.cube}`, {
      opacity: 0,
      scale: 0.25,
    }, {
      scale: 1,
      opacity: 1,
      duration: .75,
      ease: "back.out(1.27)",
      stagger: 0.05,
    }, "<+.35")
    .fromTo(`.${styles.projDescription} .${styles.listItem}`, {
      x: -10,
      opacity: 0,
      filter: "blur(5px)",
    }, {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      duration: 1,
      ease: "power2.out",
      stagger: 0.075,
    }, "<+.35")
    .fromTo(`.${styles.imageContainer} img`, {
      opacity: 0,
      filter: "blur(20px) grayscale(100%)",
      scale: 1.2
    }, {
      opacity: 1,
      filter: "blur(0px) grayscale(0%)",
      duration: 2,
      scale:1,
      ease: "power2.out",
      stagger: 0.15,
    }, "<+.2")
    .fromTo(`.${styles.imageContainer} .${styles.imageFrame}`, {
      clipPath: "inset(25% 25% 25% 25%)",
    }, {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1,
      ease: "power3.out",
      stagger: 0.15,

    }, "<")


 

  })


  useGSAP(() => {
    const fromProjectPage = navigationInfo.previousPage?.includes('project')
    const toProjectPage = navigationInfo.currentPage?.includes('project')

    if(!haveBeenAnimate.current){
      haveBeenAnimate.current = true
      tl.current?.kill()
      tlImages.current?.kill()
      if(fromProjectPage && toProjectPage || !fromProjectPage && toProjectPage){
        animationOutReverse()
      }
      else if(navigationInfo.navigationType === 'navigate' && !toProjectPage){
        animationIn(0)
      }
      else{
        animationIn(2.5)
      }
    }

    return () => {
      killAllTimelines()
    }
  },[navigationInfo.navigationType,navigationInfo.currentPage,navigationInfo.previousPage])

  // Reset haveBeenAnimate only on component unmount (page change)
  useEffect(() => {
    return () => {
      haveBeenAnimate.current = false
    }
  }, [])

  useEffect(() => {
    // Don't reset the count if we are currently redirecting to home
    if(count !== project.id && !isRedirectingRef.current){
      setCount(project.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, count])

  const animationInReverse = contextSafe((onComplete) => {
    killAllTimelines()

    let completed = 0;
    const checkComplete = () => { if(++completed === 2 && onComplete) onComplete() };

    tlOut.current = gsap.timeline({ onComplete: checkComplete });
    tlOut.current.timeScale(2);

    tlOut.current
    .to(`.${styles.buttonContainer} button span`, {
      transform: 'translateY(-100%)',
      duration: .5,
      ease: "power2.in",
    })
    .to(`.${styles.buttonContainer}`, {
      width: '0%',
      duration: .33,
      ease: "power2.in",
    }, "<+.1")
    .to(`.${styles.buttonContainer}`, {
      opacity: 0,
      filter: 'blur(5px)',
      duration: 2,
      ease: "power2.in",
    }, "<")
    .to(`.${styles.date}`, {
      opacity: 0,
      duration: 2,
      ease: "power2.in",
    }, "<+.15")
    .to(`.${styles.projectDescription}`, {
      opacity: 0,
      duration: 3,
      ease: "power2.in",
    }, "<")
    .to(`.${styles.projectDetails} h1`, {
      opacity: 0,
      filter: "blur(20px)",
      duration: 2,
      ease: "power2.in",
    }, "<+.15")
    .to(`.${styles.projectContent} nav ul`, {
      opacity: 0,
      filter: "blur(5px)",
      gap: isMobile ? "3rem" : "5rem",
      duration: 0.75,
      ease: "linear",
    }, "<+.15")
    .to(`.${styles.projectContent} .${styles.middleLineContainer}`, {
      width: "0%",
      duration: 1.5,
      ease: "power3.in",
    }, "<+.15");

    tlOutImages.current = gsap.timeline({ onComplete: checkComplete });
    tlOutImages.current.timeScale(2);

    addFadeInOutBlur(tlOutImages.current);

    tlOutImages.current
    .to(`.${styles.imageContainer} .${styles.imageFrame}`, {
      clipPath: "inset(25% 25% 25% 25%)",
      duration: 1,
      ease: "power3.in",
      stagger: 0.15,
    })
    .to(`.${styles.imageContainer} img`, {
      opacity: 0,
      filter: "blur(20px) grayscale(100%)",
      scale: 1.2,
      duration: 2,
      ease: "power2.in",
      stagger: 0.15,
    }, "<")
    .to(`.${styles.projDescription} .${styles.listItem}`, {
      x: -10,
      opacity: 0,
      filter: "blur(5px)",
      duration: 1,
      ease: "power2.in",
      stagger: 0.075,
    }, "<+.15")
    .to(`.${styles.cube}`, {
      opacity: 0,
      scale: 0.25,
      duration: .75,
      ease: "back.in(1.27)",
      stagger: 0.05,
    }, "<+.15")
    .fadeOutBlur(`.${styles.projectImages} .${styles.imagesNumber}`, { x: 20, duration: 1, position: "<+.15" })
    .fadeOutBlur(`.${styles.projectImages} .${styles.head}`, { x: 20, duration: 1, position: "<+.15" })
    .to(`.${styles.projectImages} .${styles.middleLineContainer}`, {
      width: "0%",
      duration: 1.5,
      ease: "power3.in",
    }, "<+.15");
  })

  function handleClick(id) {
      if (isAnimatingOut.current) return
      isAnimatingOut.current = true

      isRedirectingRef.current = true

      const targetCount = id === "about" ? 6 : 1
      setCount(targetCount)
      setProjectHomeActive("redirectHome")

      animationInReverse(() => {
        router.push(`/#${id}`)
        setProjectHomeActive(null)
      })
  }

  const animationOut = contextSafe((onComplete) => {
    killAllTimelines()

    let completed = 0;
    const checkComplete = () => { if(++completed === 2 && onComplete) onComplete() };

    tlOut.current = gsap.timeline({ onComplete: checkComplete });
    tlOut.current.timeScale(2);
    tlOut.current.to(`.${styles.projectDetails} h1`, {
      opacity: 0,
      filter: "blur(20px)",
      duration: 2,
      ease: "power2.in",
    })
    .to(`.${styles.projectDescription}`, {
      opacity: 0,
      duration: 2,
      ease: "power2.in",
    }, "<+.15")
    .to(`.${styles.date}`, {
      opacity: 0,
      duration: 2,
      ease: "power2.in",
    }, "<");

    tlOutImages.current = gsap.timeline({ onComplete: checkComplete });
    tlOutImages.current.timeScale(2);

    addFadeInOutBlur(tlOutImages.current);
    if(isMobile){
      tlOutImages.current.fromTo(`.${styles.projectImages} .${styles.middleLineContainer}`, {
      width: "100vw",
      }, {
        width: "0vw",
        duration: 1.5,
        delay: 2,
        ease: "power3.out",
      })
    }
    tlOutImages.current.fadeOutBlur(`.${styles.projectImages} .${styles.imagesNumber}`, { x: 20, duration: 1, position: "<+.25" })
    .to(`.${styles.cube}`, {
      opacity: 0,
      scale: 0.25,
      duration: .75,
      ease: "back.in(1.27)",
      stagger: 0.05,
    }, "<+.35")
    .to(`.${styles.projDescription} .${styles.listItem}`, {
      x: -10,
      opacity: 0,
      filter: "blur(5px)",
      duration: 1,
      ease: "power2.in",
      stagger: 0.075,
    }, "<+.35")
    .to(`.${styles.imageContainer} img`, {
      opacity: 0,
      filter: "blur(20px) grayscale(100%)",
      scale: 1.2,
      duration: 1,
      ease: "power2.in",
      stagger: 0.15,
    }, "<+.2")
    .to(`.${styles.imageContainer} .${styles.imageFrame}`, {
      clipPath: "inset(35% 35% 35% 35%)",
      duration: 1,
      ease: "power3.in",
      stagger: 0.15,
    }, "<");
  })

  const animationOutReverse = contextSafe(() => {
    tl.current = gsap.timeline();
    tl.current.timeScale(2);

    gsap.set(`.${styles.projectDetails} h1`, { opacity: 1 });

    animateSplitTextChars(`.${styles.projectDetails} h1`, {
      duration: 2,
      delay: 0,
      staggerAmount: 0.75,
      blur: 20,
      ease: "power2.out",
      timeline: tl.current,
      position: "<+.15",
    });
    tl.current.fromTo(`.${styles.projectDescription}`, {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 3,
      ease: "power2.out",
    },">-2")
    .fromTo(`.${styles.date}`, {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 2,
      ease: "power2.out",
    },"<")
    .fromTo(`.${styles.buttonContainer}`, {
      opacity: 0,
      filter: 'blur(5px)',
    }, {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 2,
      ease: "power2.out",
    },"<+.15")
    .fromTo(`.${styles.buttonContainer}`, {
      width: '0%',
    }, {
      width: 'auto',
      duration: .33,
      ease: "power2.out",
    }, "<+.25")
    .fromTo(`.${styles.buttonContainer} button span`, {
      transform: 'translateY(-100%)',
    }, {
      transform: 'translateY(0%)',
      duration: .5,
      ease: "power2.out",
    }, "<+.35");

    tlImages.current = gsap.timeline();
    tlImages.current.timeScale(2);
    addFadeInOutBlur(tlImages.current);
    tlImages.current
    if(isMobile){
      tlImages.current.fromTo(`.${styles.projectImages} .${styles.middleLineContainer}`, {
        width: "0%",
      }, {
        width: isMobile ? "100vw" : "100%",
        duration: 1.5,
        delay: 1,
        ease: "power3.out",
      })
    }

    tlImages.current.fadeInBlur(`.${styles.projectImages} .${styles.imagesNumber}`, { x: 20,duration:1,position: "<+.25" })
    .fromTo(`.${styles.cube}`, {
      opacity: 0,
      scale: 0.25,
    }, {
      scale: 1,
      opacity: 1,
      duration: .75,
      ease: "back.out(1.27)",
      stagger: 0.05,
    }, "<+.35")
    .fromTo(`.${styles.projDescription} .${styles.listItem}`, {
      x: -10,
      opacity: 0,
      filter: "blur(5px)",
    }, {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      duration: 1,
      ease: "power2.out",
      stagger: 0.075,
    }, "<+.35")
    .fromTo(`.${styles.imageContainer} img`, {
      opacity: 0,
      filter: "blur(20px) grayscale(100%)",
      scale: 1.2
    }, {
      opacity: 1,
      filter: "blur(0px) grayscale(0%)",
      duration: 2,
      scale:1,
      ease: "power2.out",
      stagger: 0.15,
    }, "<+.2")
    .fromTo(`.${styles.imageContainer} .${styles.imageFrame}`, {
      clipPath: "inset(25% 25% 25% 25%)",
    }, {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1,
      ease: "power3.out",
      stagger: 0.15,
    }, "<");
  })

  const handleClickNextProject = contextSafe(() => {
    if (isAnimatingOut.current) return
    isAnimatingOut.current = true

    haveBeenAnimate.current = false
    animationOut(() => {
      router.push(`/project/${project.nextProject}`)
    })
  })

  return (
    <article className={styles.projectPage}>
      <div className={`${styles.mobileClock} ${styles.date}`}>
        <Clock></Clock>
      </div>
      <div className={styles.projectContent}>
        <Navigation 
          variant="project" 
          selectedItem="FEATURES"
          onItemClick={handleClick}
          customStyles={{ selected: styles.selected }}
        />
        <div className={styles.middleLineContainer}>
          <span className={styles.middleLine}></span>
        </div>
        <div className={styles.projectDetails}>
          <h1>{project.innerTitle}</h1>
          <div className={styles.projectInfo}>
            <div className={styles.projectDescription}>
              {project.mainContent.map((content, index) => (
                <p key={index}>{content}</p>
              ))}
              <div className={styles.buttonContainer}>
                <button onClick={handleClickNextProject}>        
                    <span>Next Feature</span>
                </button>
              </div>
            </div>
            <time className={styles.date}>
            {project.date}
            </time>
          </div>
        </div>

      </div>
      <div className={styles.projectImages} >
        <div className={styles.head}><Clock></Clock></div>
        <div className={styles.middleLineContainer}>
          <span className={styles.middleLine}></span>
        </div>        
        <div className={styles.imagesDetails}>
          <p className={styles.imagesNumber}>Image N°{project.imagesProject.length}</p>
          <div className={styles.projInfos}>
            <div className={styles.projCubes}>
            {project.imagesProject.map((image, index) => (
                         <span key={index} className={styles.cube}></span>
            ))}
          
            </div>
            <div className={styles.projDescription}>
              {
                Object.keys(project.details).map((detail, index) => {
                  if(detail === "link"){
                    return(
                      <div className={`${styles.buttonContainerLink} ${styles.listItem}`} key={index}>
                          <a className={styles.link} href={project.details[detail].startsWith('http') ? project.details[detail] : `https://${project.details[detail]}`} target="_blank" rel="noopener noreferrer"> 
                            <span>See live</span>
                          </a>                      
                      </div>
                    )
                  }
                  return(
                  <p key={index} className={`${styles.listItem}`}><strong>{detail} : </strong> {project.details[detail]}</p>
                )})
              }
            </div>
          </div>
          <div className={styles.imageContainer}>
            {project.imagesProject.map((image, index) => (
              <div className={styles.imageFrame} key={index}>
                <Image src={image} alt={`${project.title} — image ${index + 1}`} width={1000} height={1000} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
