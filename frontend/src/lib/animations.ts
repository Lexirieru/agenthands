import gsap from 'gsap';

export function fadeInUp(el: gsap.TweenTarget, delay = 0) {
  return gsap.from(el, {
    opacity: 0,
    y: 30,
    duration: 0.6,
    delay,
    ease: 'power2.out',
  });
}

export function staggerChildren(
  parent: gsap.TweenTarget,
  selector: string,
  stagger = 0.08,
) {
  return gsap.from(`${parent} ${selector}`, {
    opacity: 0,
    y: 30,
    duration: 0.5,
    stagger,
    ease: 'power2.out',
  });
}

export function countUp(el: Element, target: number) {
  const obj = { val: 0 };
  return gsap.to(obj, {
    val: target,
    duration: 1.2,
    ease: 'power1.out',
    onUpdate() {
      el.textContent = Math.round(obj.val).toLocaleString();
    },
  });
}

export function scaleIn(el: gsap.TweenTarget, delay = 0) {
  return gsap.from(el, {
    opacity: 0,
    scale: 0.95,
    duration: 0.5,
    delay,
    ease: 'power2.out',
  });
}
