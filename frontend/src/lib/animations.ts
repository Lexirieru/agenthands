import gsap from 'gsap';

/**
 * Fade-and-rise entrance for a single element.
 * Used on Celo task cards and form containers to soften page transitions.
 *
 * @param el    - GSAP tween target (element, selector, or NodeList).
 * @param delay - Seconds to wait before the tween starts (default `0`).
 * @returns GSAP Tween instance — call `.kill()` to cancel early.
 * @since 1.0.0
 */
export function fadeInUp(el: gsap.TweenTarget, delay = 0) {
  return gsap.from(el, {
    opacity: 0,
    y: 30,
    duration: 0.6,
    delay,
    ease: 'power2.out',
  });
}

/**
 * Stagger-fade children of a parent container — e.g. the task-card grid.
 * Each child fades up with an `stagger`-second offset so the list feels
 * alive rather than appearing all at once.
 *
 * @param parent   - Selector string or element that contains the children.
 * @param selector - CSS selector for the child elements to animate.
 * @param stagger  - Seconds between each child's tween start (default `0.08`).
 * @returns GSAP Tween instance for the stagger batch.
 * @since 1.0.0
 */
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

/**
 * Animate a numeric counter from 0 to `target` over 1.2 seconds.
 * Drives the stat counters on the Celo dashboard (tasks posted, completed, etc.).
 *
 * @param el     - DOM element whose `textContent` is updated on every tick.
 * @param target - Final integer value the counter should reach.
 * @returns GSAP Tween instance — resolves when `val` reaches `target`.
 * @since 1.0.0
 */
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

/**
 * Subtle scale-and-fade entrance — used for modal cards and dialogs
 * (e.g. the proof-upload confirmation on Celo task submission).
 *
 * @param el - GSAP tween target.
 * @param delay - Seconds before the tween starts (default 0).
 */
export function scaleIn(el: gsap.TweenTarget, delay = 0) {
  return gsap.from(el, {
    opacity: 0,
    scale: 0.95,
    duration: 0.5,
    delay,
    ease: 'power2.out',
  });
}
