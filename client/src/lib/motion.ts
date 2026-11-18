import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register once (idempotent across modules).
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** True when the user prefers reduced motion — heavy effects are disabled. */
export const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const EASE = {
  expo: 'expo.out',
  power3: 'power3.out',
  power2: 'power2.out',
  sine: 'sine.inOut',
} as const;

export const MOTION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.05,
} as const;

/** Small helper: create a ScrollTrigger scrub tween on an element. */
export function scrubTo(
  target: string | Element,
  vars: gsap.TweenVars,
  trigger?: Element | string,
) {
  return gsap.to(target, {
    ...vars,
    ease: 'none',
    scrollTrigger: {
      trigger: trigger ?? target,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.4,
    },
  });
}
