import { Link } from 'react-router-dom';
import { Page } from '@/components/Page';

const PRINCIPLES = [
  {
    title: 'Ask anything',
    text: 'Course questions, exam prep, study doubts — the whole campus in one place.',
  },
  {
    title: 'Answer to earn',
    text: 'Every helpful answer builds your reputation. Accepted answers give the biggest boost.',
  },
  {
    title: 'Papers, shared',
    text: 'Previous-year papers are uploaded by students for students — no more hunting in group chats.',
  },
  {
    title: 'Respectful & moderated',
    text: 'Reports are reviewed by moderators. Keep it academic and kind.',
  },
];

export function About() {
  return (
    <Page kicker="About" title="Que-swer" className="max-w-3xl">
      <div className="space-y-6">
        <div className="card-surface p-6 sm:p-8">
          <p className="leading-relaxed text-muted">
            Que-swer is a student-built platform for{' '}
            <span className="text-ink font-medium">North-Eastern Hill University</span>. It replaces
            the static question-paper site with something the whole campus can use: ask, answer, and
            share previous-year papers — with reputation, moderation, and a paper library that
            actually works.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="card-surface p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>

        <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-semibold">Open source</h2>
            <p className="text-sm text-muted">Built with React, Express, PostgreSQL.</p>
          </div>
          <Link to="/contact" className="btn-secondary">
            Get in touch
          </Link>
        </div>
      </div>
    </Page>
  );
}
