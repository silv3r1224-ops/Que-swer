import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageCircle } from 'lucide-react';
import { useDepartments, useQuestions } from '@/lib/hooks';
import { Hero } from '@/components/hero/Hero';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionCardSkeleton, Skeleton } from '@/components/ui';
import { gsap, EASE, REDUCED_MOTION } from '@/lib/motion';

export function Home() {
  const rootRef = useRef<HTMLDivElement>(null);

  const departments = useDepartments();
  const recent = useQuestions({ page: 1, pageSize: 5, sort: 'new' });

  // Scroll-reveals for the sections below the hero.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || REDUCED_MOTION) return;

    const ctx = gsap.context(() => {
      gsap.from('.reveal-grid > *', {
        autoAlpha: 0,
        y: 30,
        stagger: 0.07,
        duration: 0.75,
        ease: EASE.power3,
        immediateRender: false,
        scrollTrigger: { trigger: '.reveal-grid', start: 'top 84%', once: true },
      });

      gsap.from('.reveal-simple', {
        autoAlpha: 0,
        y: 24,
        duration: 0.7,
        ease: EASE.power3,
        immediateRender: false,
        scrollTrigger: { trigger: '.reveal-simple', start: 'top 88%', once: true },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef}>
      <Hero />

      {/* ======================= DEPARTMENTS ======================= */}
      <section className="container-site pt-14">
        <div className="reveal-simple mb-6 flex items-end justify-between">
          <div>
            <p className="kicker">Streams</p>
            <h2 className="mt-1 text-2xl font-bold">Browse by department</h2>
          </div>
          <Link to="/papers" className="btn-ghost text-sm">
            All papers <ArrowRight size={15} />
          </Link>
        </div>

        {departments.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="reveal-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.data?.departments.map((d) => (
              <Link
                key={d.id}
                to={`/questions?departmentId=${d.id}`}
                className="card-surface group p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                    <BookOpen size={20} />
                  </span>
                  <span className="text-xs text-muted">
                    {d._count?.papers ?? 0} papers · {d._count?.courses ?? 0} courses
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold group-hover:text-accent transition-colors">
                  {d.name}
                </h3>
                <p className="mt-1 text-sm text-muted line-clamp-2">{d.description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ======================= RECENT ======================= */}
      <section className="container-site pt-14">
        <div className="reveal-simple mb-6 flex items-end justify-between">
          <div>
            <p className="kicker">Fresh</p>
            <h2 className="mt-1 text-2xl font-bold">Recent questions</h2>
          </div>
          <Link to="/questions" className="btn-ghost text-sm">
            View all <ArrowRight size={15} />
          </Link>
        </div>

        <div className="reveal-grid space-y-4">
          {recent.isLoading ? (
            <>
              <QuestionCardSkeleton />
              <QuestionCardSkeleton />
            </>
          ) : recent.data?.questions.length ? (
            recent.data.questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))
          ) : (
            <div className="card-surface p-10 text-center text-muted">
              <MessageCircle className="mx-auto mb-3" size={32} />
              <p>No questions yet — be the first to ask!</p>
              <Link to="/questions/new" className="btn-primary mt-4 inline-flex">
                Ask a question
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ======================= CTA ======================= */}
      <section className="container-site pt-14">
        <div className="reveal-simple card-surface relative overflow-hidden p-10 text-center">
          <div
            className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
            aria-hidden="true"
          />
          <h2 className="relative text-2xl sm:text-3xl font-bold">
            Help your classmates — and get helped
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-muted">
            Every answer earns reputation. Every paper you upload saves someone's semester.
          </p>
          <div className="relative mt-6 flex justify-center gap-3">
            <Link to="/register" className="btn-primary">
              Create account <ArrowRight size={16} />
            </Link>
            <Link to="/papers" className="btn-secondary">
              Browse papers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
