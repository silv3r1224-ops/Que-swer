import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { gsap, EASE, MOTION, REDUCED_MOTION } from '@/lib/motion';
import { usePapers, useQuestions } from '@/lib/hooks';

/* ------------------------------------------------------------------ */
/* High-quality education imagery (Unsplash CDN) with SVG fallback.     */
/* ------------------------------------------------------------------ */

const IMG_STUDY =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80';
const IMG_GRAD =
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=640&q=80';
const IMG_CAMPUS =
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=760&q=80';

const FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#14231c"/><stop offset="1" stop-color="#0d1713"/>
     </linearGradient></defs>
     <rect width="640" height="400" fill="url(#g)"/>
     <text x="320" y="205" font-family="Arial" font-size="44" fill="#e6c57b" text-anchor="middle">📚</text>
   </svg>`,
)}`;

function SmartImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [state, setState] = useState<'load' | 'error'>('load');
  if (state === 'error') {
    return <img src={FALLBACK_SVG} alt={alt} className={className} loading="lazy" />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setState('error')}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */

const QUICK_LINKS = [
  { label: 'Physics', to: '/questions?tag=physics', icon: FlaskConical },
  { label: 'Chemistry', to: '/questions?tag=chemistry', icon: FlaskConical },
  { label: 'Mathematics', to: '/questions?tag=mathematics', icon: BookOpen },
  { label: 'Computer Science', to: '/questions?tag=computer-science', icon: GraduationCap },
];

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const questions = useQuestions({ page: 1, pageSize: 1 });
  const papers = usePapers({ page: 1, pageSize: 1 });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/questions?q=${encodeURIComponent(q.trim())}` : '/questions');
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Pointer-parallax is silly on touch + reduced motion.
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const ctx = gsap.context(() => {
      if (!REDUCED_MOTION) {
        const tl = gsap.timeline({ defaults: { ease: EASE.expo } });

        tl.from('.hero-kicker', { y: 24, opacity: 0, duration: 0.7 })
          .from('.hero-line', { yPercent: 120, duration: MOTION.slow, stagger: 0.15 }, '-=0.35')
          .from('.hero-sub', { y: 18, opacity: 0, duration: 0.65 }, '-=0.55')
          .from('.hero-search', { y: 18, opacity: 0, scale: 0.98, duration: 0.7 }, '-=0.5')
          .from('.hero-chip', { y: 12, opacity: 0, stagger: 0.06, duration: 0.4 }, '-=0.5')
          .from('.hero-stat', { y: 16, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.55')
          .from(
            '.hero-visual-item',
            {
              y: 46,
              opacity: 0,
              rotate: (i: number) => (i % 2 === 0 ? -3 : 3),
              stagger: 0.14,
              duration: MOTION.slow,
            },
            '-=0.75',
          );

        // Idle float animations.
        gsap.to('.hero-float-slow', {
          y: 14,
          duration: 4.2,
          ease: EASE.sine,
          yoyo: true,
          repeat: -1,
        });
        gsap.to('.hero-float-fast', {
          y: -10,
          duration: 3.1,
          ease: EASE.sine,
          yoyo: true,
          repeat: -1,
        });
        gsap.to('.hero-ring', { rotate: 360, duration: 60, ease: 'none', repeat: -1 });

        // Count-up stats (start once visible).
        const statEls = root.querySelectorAll<HTMLElement>('[data-count]');
        statEls.forEach((el) => {
          const target = Number(el.dataset.count ?? 0);
          const state = { v: 0 };
          gsap.to(state, {
            v: target,
            duration: 1.8,
            ease: EASE.power2,
            scrollTrigger: { trigger: el, start: 'top 90%' },
            onUpdate: () => {
              el.textContent = Math.round(state.v).toLocaleString();
            },
          });
        });
      }

      if (!REDUCED_MOTION && !coarse) {
        // Pointer parallax on orbs + collage.
        const orbA = root.querySelector('.hero-orb-a');
        const orbB = root.querySelector('.hero-orb-b');
        const collage = root.querySelector('.hero-collage');
        const cleanups: Array<() => void> = [];

        if (orbA && orbB && collage) {
          const moveX = gsap.quickTo(orbA, 'x', { duration: 0.9, ease: EASE.power3 });
          const moveY = gsap.quickTo(orbA, 'y', { duration: 0.9, ease: EASE.power3 });
          const bx = gsap.quickTo(orbB, 'x', { duration: 1.1, ease: EASE.power3 });
          const by = gsap.quickTo(orbB, 'y', { duration: 1.1, ease: EASE.power3 });
          const cx = gsap.quickTo(collage, 'x', { duration: 0.8, ease: EASE.power3 });
          const cy = gsap.quickTo(collage, 'y', { duration: 0.8, ease: EASE.power3 });

          const onMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect();
            const dx = (e.clientX - rect.left) / rect.width - 0.5;
            const dy = (e.clientY - rect.top) / rect.height - 0.5;
            moveX(dx * 34);
            moveY(dy * 24);
            bx(dx * -28);
            by(dy * -18);
            cx(dx * 12);
            cy(dy * 8);
          };
          root.addEventListener('pointermove', onMove);
          cleanups.push(() => root.removeEventListener('pointermove', onMove));
        }

        // Magnetic search button.
        const magnetic = root.querySelector('.hero-magnetic');
        if (magnetic && magnetic.firstElementChild instanceof HTMLElement) {
          const btn = magnetic.firstElementChild;
          const xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: EASE.power3 });
          const yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: EASE.power3 });
          const onMove = (e: PointerEvent) => {
            const r = magnetic.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.3);
            yTo((e.clientY - r.top - r.height / 2) * 0.3);
          };
          const onLeave = () => {
            xTo(0);
            yTo(0);
          };
          magnetic.addEventListener('pointermove', onMove);
          magnetic.addEventListener('pointerleave', onLeave);
          cleanups.push(() => {
            magnetic.removeEventListener('pointermove', onMove);
            magnetic.removeEventListener('pointerleave', onLeave);
          });
        }

        return () => cleanups.forEach((fn) => fn());
      }
    }, root);

    return () => ctx.revert();
  }, []);

  const stats = [
    { label: 'Departments', count: 3 },
    { label: 'Questions', count: questions.data?.meta.total ?? 0 },
    { label: 'Papers', count: papers.data?.meta.total ?? 0 },
  ];

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      {/* ---- Background: orbs + rings ---- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="hero-orb-a absolute -top-24 right-[8%] h-80 w-80 rounded-full opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgb(230 197 123 / 0.28), transparent 70%)',
          }}
        />
        <div
          className="hero-orb-b absolute bottom-[-6rem] left-[2%] h-96 w-96 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(16 185 129 / 0.22), transparent 70%)' }}
        />
        <svg
          className="hero-ring absolute -right-24 top-16 h-[30rem] w-[30rem] text-accent/15"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle
            cx="100"
            cy="100"
            r="96"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="4 10"
          />
          <circle
            cx="100"
            cy="100"
            r="70"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 8"
          />
          <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="0.4" />
          <circle cx="100" cy="4" r="4" fill="currentColor" />
        </svg>
      </div>

      <div className="container-site relative grid items-center gap-12 pt-12 pb-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20 lg:pb-20">
        {/* ======================= Left column ======================= */}
        <div>
          <p className="hero-kicker kicker inline-flex items-center gap-2">
            <Sparkles size={14} /> NEHU campus knowledge hub
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.04]">
            <span className="block overflow-hidden pb-1">
              <span className="hero-line block">Ask. Answer.</span>
            </span>
            <span className="block overflow-hidden pb-2">
              <span className="hero-line block text-accent">Ace every exam.</span>
            </span>
          </h1>

          <p className="hero-sub mt-5 max-w-lg text-base sm:text-lg text-muted leading-relaxed">
            Ask questions, help classmates, and unlock previous-year papers — all in one quiet
            corner of campus.
          </p>

          {/* Search */}
          <form
            onSubmit={onSearch}
            className="hero-search mt-8 flex max-w-xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-card focus-within:shadow-glow transition-shadow"
          >
            <Search className="text-muted shrink-0" size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions, papers, subjects…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Search"
            />
            <span className="hero-magnetic inline-block">
              <button type="submit" className="btn-primary !rounded-full !px-5">
                Search <ArrowRight size={15} />
              </button>
            </span>
          </form>

          {/* Quick chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} to={link.to} className="hero-chip chip">
                  <Icon size={13} /> {link.label}
                </Link>
              );
            })}
            <Link to="/papers" className="hero-chip chip border-accent/40 text-accent">
              All papers <ArrowRight size={12} />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface/60">
            {stats.map((s) => (
              <div key={s.label} className="hero-stat px-4 py-4">
                <p className="text-2xl font-bold font-display tabular-nums">
                  <span data-count={s.count}>{s.count}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ======================= Right: collage ======================= */}
        <div className="hero-collage relative hidden lg:block" aria-hidden="false">
          {/* Main study image card */}
          <div className="hero-visual-item hero-float-slow relative z-10 ml-auto w-[86%] -rotate-2">
            <div
              className="card-surface overflow-hidden rounded-2xl border-2 border-accent/20 p-2"
              style={{ boxShadow: '0 30px 80px rgb(0 0 0 / 0.45)' }}
            >
              <SmartImage
                src={IMG_STUDY}
                alt="Students studying together"
                className="h-72 w-full rounded-xl object-cover"
              />
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--ink)' }}
                  >
                    G
                  </span>
                  <span className="font-medium">Physics · Week 9</span>
                </div>
                <span className="chip chip-active">Open</span>
              </div>
            </div>
          </div>

          {/* Campus card (overlap) */}
          <div className="hero-visual-item hero-float-fast absolute -left-2 bottom-2 z-20 w-[52%] rotate-3">
            <div
              className="card-surface overflow-hidden rounded-2xl border-2 border-accent/25 p-2"
              style={{ boxShadow: '0 24px 60px rgb(0 0 0 / 0.4)' }}
            >
              <SmartImage
                src={IMG_CAMPUS}
                alt="NEHU campus"
                className="h-40 w-full rounded-xl object-cover"
              />
            </div>
          </div>

          {/* Graduation card (overlap) */}
          <div className="hero-visual-item absolute -top-3 left-[30%] z-30 w-[42%] -rotate-3">
            <div
              className="card-surface overflow-hidden rounded-2xl border border-accent/30 p-1.5"
              style={{ boxShadow: '0 20px 50px rgb(0 0 0 / 0.35)' }}
            >
              <SmartImage
                src={IMG_GRAD}
                alt="Graduation caps"
                className="h-28 w-full rounded-xl object-cover"
              />
            </div>
          </div>

          {/* Floating pills */}
          <div className="hero-visual-item hero-float-fast absolute right-0 top-6 z-40">
            <div className="card-surface flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-pop">
              <BadgeCheck size={15} className="text-success" /> Answer accepted
            </div>
          </div>
          <div className="hero-visual-item hero-float-slow absolute -right-4 bottom-16 z-40">
            <div className="card-surface flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-pop">
              <TrendingUp size={15} className="text-accent" /> +50 reputation
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
