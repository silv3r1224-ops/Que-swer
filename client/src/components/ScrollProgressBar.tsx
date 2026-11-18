import { useLayoutEffect, useRef } from 'react';
import { gsap, REDUCED_MOTION } from '@/lib/motion';

/** Thin gold progress bar pinned under the header. */
export function ScrollProgressBar() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (REDUCED_MOTION) {
      gsap.set(el, { scaleX: 0 });
      return;
    }
    gsap.set(el, { scaleX: 0, transformOrigin: 'left center' });
    const tween = gsap.to(el, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[60] h-[3px] w-full"
      style={{ background: 'var(--accent)' }}
      aria-hidden="true"
    />
  );
}
