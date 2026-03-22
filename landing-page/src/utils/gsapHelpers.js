import { gsap } from 'gsap';
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/**
 * Adds a fadeInBlur method to a GSAP timeline to simplify fade in animations
 * with blur and horizontal translation
 *
 * @param {gsap.core.Timeline} timeline - The GSAP timeline to extend
 * @returns {gsap.core.Timeline} - The modified timeline to allow chaining
 */
export function addFadeInOutBlur(timeline) {
  timeline.fadeInBlur = function(selector, options = {}) {
    const {
      x = 0,                    // Initial x position (default: 0)
      blur = 5,                 // Initial blur intensity (default: 5px)
      duration = 0.35,           // Animation duration (default: 0.5s)
      ease = "power2.out",      // Easing type (default: power2.out)
      position,                  // Position in the timeline (e.g.: "<+.15")
      scaleYBase = 1,            // Initial scaleY (default: 1)
      scaleYEnd = 1              // Final scaleY (default: 1)
    } = options;

    // Call fromTo with default values
    return this.fromTo(selector, {
      opacity: 0,
      filter: `blur(${blur}px)`,
      x: x,
      scaleY: scaleYBase,
    }, {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      scaleY: scaleYEnd,
      duration: duration,
      ease: ease,
    }, position);
  };

  timeline.fadeOutBlur = function(selector, options = {}) {
    const {
      x = 0,                    // Initial x position (default: 0)
      blur = 5,                 // Initial blur intensity (default: 5px)
      duration = 0.35,           // Animation duration (default: 0.5s)
      ease = "power2.out",      // Easing type (default: power2.out)
      position                  // Position in the timeline (e.g.: "<+.15")
    } = options;
    return this.to(selector, {
      opacity: 0,
      filter: `blur(${blur}px)`,
      x: x,
      duration: duration,
      ease: ease,
    }, position);
  };
  return timeline;
}

/**
 * Fade in animation with blur for an element
 * @param {string} selector - CSS selector of the element
 * @param {number|Object} durationOrOptions - Animation duration (default: 1.5) or full options
 * @param {number} delay - Delay before the animation (default: 0)
 * @param {number} blur - Initial blur intensity (default: 20)
 * @param {gsap.core.Timeline} timeline - GSAP timeline to use (optional)
 * @param {string} position - Position in the timeline (e.g.: "<+.15")
 * @returns {gsap.core.Tween|gsap.core.Timeline} - The created animation or the timeline if provided
 */
export function animHomeBlur(selector, durationOrOptions = 1.5, delay = 0, blur = 20, timeline = null, position = null) {
  // Support for options as object
  let duration = durationOrOptions;
  let options = {};
  if (typeof durationOrOptions === 'object' && durationOrOptions !== null) {
    options = durationOrOptions;
    duration = options.duration ?? 1.5;
    delay = options.delay ?? delay;
    blur = options.blur ?? blur;
    timeline = options.timeline ?? timeline;
    position = options.position ?? position;
  }

  const fromConfig = {
    filter: `blur(${blur}px)`,
    opacity: 0,
  };
  const toConfig = {
    opacity: 1,
    filter: "blur(0px)",
    duration: duration,
    scale: 1,
    delay: delay,
  };

  if (timeline) {
    return timeline.fromTo(selector, fromConfig, toConfig, position);
  } else {
    return gsap.fromTo(selector, fromConfig, toConfig);
  }
}

/**
 * SplitText animation for characters with blur and random stagger
 * @param {string} selector - CSS selector of the element
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration (default: 0.75)
 * @param {number} options.delay - Delay before the animation (default: 2)
 * @param {number} options.staggerAmount - Total stagger duration (default: 1)
 * @param {number} options.blur - Initial blur intensity (default: 20)
 * @param {Object} options.scrollTrigger - ScrollTrigger configuration (optional)
 * @param {string} options.ease - Easing type (default: "power2.out")
 * @param {gsap.core.Timeline} options.timeline - GSAP timeline to use (optional)
 * @param {string} options.position - Position in the timeline (e.g.: "<+.15")
 * @returns {Object|gsap.core.Timeline} - Object containing { split, animation, scrollTrigger } or timeline if provided
 */
export function animateSplitTextChars(selector, options = {}) {
  const {
    duration = 0.75,
    delay = 2,
    staggerAmount = 1,
    blur = 20,
    scrollTrigger,
    ease,
    timeline,
    position
  } = options;

  const split = SplitText.create(selector, {
    type: "chars, words"
  });

  const animationConfig = {
    opacity: 1,
    filter: "blur(0px)",
    duration: duration,
    scale: 1,
    delay: delay,
    stagger: {
      amount: staggerAmount,
      from: "random"
    }
  };

  let scrollTriggerInstance = null;
  if (scrollTrigger && !timeline) {
    animationConfig.scrollTrigger = scrollTrigger;
  }

  if (ease) {
    animationConfig.ease = ease;
  }

  let animation;
  if (timeline) {
    animation = timeline.fromTo(split.chars, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig, position);
    return timeline;
  } else {
    animation = gsap.fromTo(split.chars, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig);

    // Retrieve the ScrollTrigger instance if it exists
    if (scrollTrigger && animation.scrollTrigger) {
      scrollTriggerInstance = animation.scrollTrigger;
    }

    return { split, animation, scrollTrigger: scrollTriggerInstance };
  }
}

/**
 * SplitText animation for words with blur and scroll trigger
 * @param {string} selector - CSS selector of the element
 * @param {Object} scrollTriggerConfig - ScrollTrigger configuration (can be null if used in a timeline)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration (default: 0.75)
 * @param {number} options.delay - Delay before the animation (default: 2)
 * @param {number} options.staggerAmount - Total stagger duration (default: 1)
 * @param {number} options.blur - Initial blur intensity (default: 5)
 * @param {gsap.core.Timeline} options.timeline - GSAP timeline to use (optional)
 * @param {string} options.position - Position in the timeline (e.g.: "<+.15")
 * @returns {Object|gsap.core.Timeline} - Object containing { split, animation, scrollTrigger } or timeline if provided
 */
export function animateSplitTextWords(selector, scrollTriggerConfig, options = {}) {
  const {
    duration = 0.75,
    delay = 2,
    staggerAmount = 1,
    blur = 5,
    timeline,
    position
  } = options;

  const split = SplitText.create(selector, {
    type: "chars, words"
  });

  const animationConfig = {
    opacity: 1,
    filter: "blur(0px)",
    duration: duration,
    scale: 1,
    delay: delay,
    stagger: {
      amount: staggerAmount,
    }
  };

  if (scrollTriggerConfig && !timeline) {
    animationConfig.scrollTrigger = scrollTriggerConfig;
  }

  let animation;
  if (timeline) {
    animation = timeline.fromTo(split.words, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig, position);
    return timeline;
  } else {
    animation = gsap.fromTo(split.words, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig);

    const scrollTriggerInstance = animation.scrollTrigger || null;
    return { split, animation, scrollTrigger: scrollTriggerInstance };
  }
}

/**
 * Animation for navigation elements with blur, scaleY and opacity
 * @param {string} selector - CSS selector of the element
 * @param {Object} scrollTriggerConfig - ScrollTrigger configuration (can be null if used in a timeline)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration (default: 0.75)
 * @param {number} options.delay - Delay before the animation (default: 2)
 * @param {number} options.blur - Initial blur intensity (default: 5)
 * @param {number} options.scaleYStart - Initial scaleY (default: 0.5)
 * @param {number} options.gapStart - Initial gap (default: "4.5rem")
 * @param {number} options.gapEnd - Final gap (default: "5rem")
 * @param {string} options.ease - Easing type (default: "circ.out")
 * @param {gsap.core.Timeline} options.timeline - GSAP timeline to use (optional)
 * @returns {Object} - Object containing { animation, scrollTrigger, timeline }
 */
export function animateNav(selector, scrollTriggerConfig, options = {}) {
  const {
    duration = 0.75,
    delay = 2,
    blur = 5,
    scaleYStart = 0.5,
    gapStart = "4.5rem",
    gapEnd = "5rem",
    ease = "circ.out",
    timeline,
    position
  } = options;

  const animationConfig = {
    opacity: 1,
    filter: "blur(0px)",
    duration: duration,
    scaleY: 1,
    delay: delay,
    ease: ease,
    gap: gapEnd,
    stagger: {
      amount: 1,
      from: "random"
    }
  };

  if (scrollTriggerConfig && !timeline) {
    animationConfig.scrollTrigger = scrollTriggerConfig;
  }

  const fromToConfig = {
    filter: `blur(${blur}px)`,
    scaleY: scaleYStart,
    opacity: 0,
    gap: gapStart
  };

  if (timeline) {
    const animation = timeline.fromTo(selector, fromToConfig, animationConfig, position);
    return timeline; // Return the timeline to allow chaining
  } else {
    const animation = gsap.fromTo(selector, fromToConfig, animationConfig, position);
    return { animation, scrollTrigger: animation.scrollTrigger || null, timeline: null };
  }
}

/**
 * Animation for a simple element with blur fade in
 * @param {string} selector - CSS selector of the element
 * @param {Object} scrollTriggerConfig - ScrollTrigger configuration (can be null if used in a timeline)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration (default: 0.75)
 * @param {number} options.delay - Delay before the animation (default: 2)
 * @param {number} options.blur - Initial blur intensity (default: 5)
 * @param {gsap.core.Timeline} options.timeline - GSAP timeline to use (optional)
 * @param {string} options.position - Position in the timeline (e.g.: "<+.15")
 * @returns {Object|gsap.core.Timeline} - Object containing { animation, scrollTrigger } or timeline if provided
 */
export function animateBlurFadeIn(selector, scrollTriggerConfig, options = {}) {
  const {
    duration = 0.75,
    delay = 2,
    blur = 5,
    timeline,
    position
  } = options;

  const animationConfig = {
    opacity: 1,
    filter: "blur(0px)",
    duration: duration,
    scale: 1,
    delay: delay,
  };

  if (scrollTriggerConfig && !timeline) {
    animationConfig.scrollTrigger = scrollTriggerConfig;
  }

  if (timeline) {
    const animation = timeline.fromTo(selector, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig, position);
    return timeline;
  } else {
    const animation = gsap.fromTo(selector, {
      filter: `blur(${blur}px)`,
      opacity: 0,
    }, animationConfig);

    return { animation, scrollTrigger: animation.scrollTrigger || null };
  }
}

/**
 * Creates a ScrollTrigger with event handling
 * @param {Object} config - ScrollTrigger configuration
 * @param {string} config.trigger - CSS selector of the trigger element
 * @param {string} config.start - Start position (e.g.: '37% bottom')
 * @param {string} config.end - End position (e.g.: '37% bottom')
 * @param {string} config.toggleActions - Toggle actions (default: 'play none reverse none')
 * @param {Function} config.onEnter - Callback called on enter
 * @param {Function} config.onEnterBack - Callback called on enter back
 * @param {Function} config.onLeave - Callback called on leave
 * @param {Function} config.onLeaveBack - Callback called on leave back
 * @param {Function} config.onUpdate - Callback called on each update
 * @param {Function} config.onToggle - Callback called on toggle
 * @param {Object} config.additionalConfig - Additional ScrollTrigger configuration (scrub, pin, etc.)
 * @returns {Object} - Object containing { scrollTrigger }
 */
export function createScrollTrigger(config) {
  const {
    trigger,
    start,
    end,
    toggleActions = 'play none reverse none',
    onEnter,
    onEnterBack,
    onLeave,
    onLeaveBack,
    onUpdate,
    onToggle,
    additionalConfig = {}
  } = config;

  const scrollTriggerConfig = {
    trigger,
    start,
    end,
    toggleActions,
    ...additionalConfig
  };

  // Add callbacks if they are provided
  if (onEnter) scrollTriggerConfig.onEnter = onEnter;
  if (onEnterBack) scrollTriggerConfig.onEnterBack = onEnterBack;
  if (onLeave) scrollTriggerConfig.onLeave = onLeave;
  if (onLeaveBack) scrollTriggerConfig.onLeaveBack = onLeaveBack;
  if (onUpdate) scrollTriggerConfig.onUpdate = onUpdate;
  if (onToggle) scrollTriggerConfig.onToggle = onToggle;

  // Create an empty timeline with the ScrollTrigger to be able to retrieve it
  const timeline = gsap.timeline({ scrollTrigger: scrollTriggerConfig });

  return { scrollTrigger: timeline.scrollTrigger, timeline };
}

/**
 * Creates multiple ScrollTriggers from an array of configurations
 * Useful for creating multiple triggers with predefined start/end values
 * @param {string} triggerSelector - Common CSS selector for all triggers
 * @param {Array} triggerConfigs - Array of configurations for each trigger
 * @param {Object} triggerConfigs[].start - Start position
 * @param {Object} triggerConfigs[].end - End position
 * @param {Object} triggerConfigs[].events - Object containing callbacks (onEnter, onEnterBack, etc.)
 * @param {Object} triggerConfigs[].additionalConfig - Additional configuration
 * @param {string} defaultToggleActions - Default toggle actions (default: 'play none reverse none')
 * @returns {Array} - Array of objects containing { scrollTrigger, timeline }
 */
export function createMultipleScrollTriggers(triggerSelector, triggerConfigs, defaultToggleActions = 'play none reverse none') {
  return triggerConfigs.map(config => {
    const {
      start,
      end,
      events = {},
      additionalConfig = {},
      toggleActions = defaultToggleActions
    } = config;

    return createScrollTrigger({
      trigger: triggerSelector,
      start,
      end,
      toggleActions,
      onEnter: events.onEnter,
      onEnterBack: events.onEnterBack,
      onLeave: events.onLeave,
      onLeaveBack: events.onLeaveBack,
      onUpdate: events.onUpdate,
      onToggle: events.onToggle,
      additionalConfig
    });
  });
}

/**
 * Cleans up all animations, timelines and ScrollTriggers
 * @param {Array} cleanupItems - Array of objects containing { split, animation, scrollTrigger, timeline }
 */
export function cleanupAnimations(cleanupItems = []) {
  cleanupItems.forEach(item => {
    if (!item) return;

    // Clean up SplitText
    if (item.split) {
      try {
        item.split.revert();
      } catch (e) {
        console.warn('Error reverting SplitText:', e);
      }
    }

    // Clean up ScrollTrigger
    if (item.scrollTrigger) {
      try {
        item.scrollTrigger.kill();
      } catch (e) {
        console.warn('Error killing ScrollTrigger:', e);
      }
    }

    // Clean up Timeline
    if (item.timeline) {
      try {
        item.timeline.kill();
      } catch (e) {
        console.warn('Error killing Timeline:', e);
      }
    }

    // Clean up Animation
    if (item.animation) {
      try {
        item.animation.kill();
      } catch (e) {
        console.warn('Error killing Animation:', e);
      }
    }
  });
}
