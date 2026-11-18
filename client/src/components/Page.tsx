import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard page container. Adds a data-visible stagger class for
 * reveal-on-scroll via CSS (IntersectionObserver here, no GSAP needed
 * for the basic version).
 */
export function Page({
  title,
  kicker,
  actions,
  children,
  className,
}: {
  title?: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = ref.current;
    if (!rootEl) return;
    const els = rootEl.querySelectorAll<HTMLElement>('.stagger-in');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('container-site pt-8', className)}>
      {(kicker || title || actions) && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="stagger-in">
            {kicker && <p className="kicker">{kicker}</p>}
            {title && <h1 className="mt-1.5 text-3xl sm:text-4xl font-bold">{title}</h1>}
          </div>
          {actions && <div className="stagger-in">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
