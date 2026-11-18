import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, REDUCED_MOTION } from '@/lib/motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollProgressBar } from './ScrollProgressBar';

export function Layout() {
  const { pathname, search } = useLocation();

  // Lenis smooth scrolling, synced with GSAP ScrollTrigger.
  useEffect(() => {
    if (REDUCED_MOTION) return;
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  // Scroll to top on route change (keep for in-page anchors).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgressBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
