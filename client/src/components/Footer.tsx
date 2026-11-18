import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="container-site py-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white font-bold text-xs">
              QS
            </span>
            <span className="font-display font-bold">Que-swer</span>
          </Link>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            NEHU Questions &amp; Answers — ask, answer, and browse previous-year papers.
          </p>
        </div>

        <nav className="flex gap-10 text-sm" aria-label="Footer">
          <div className="space-y-2">
            <p className="font-semibold">Explore</p>
            <Link to="/questions" className="block text-muted hover:text-ink transition-colors">
              Questions
            </Link>
            <Link to="/papers" className="block text-muted hover:text-ink transition-colors">
              Papers
            </Link>
            <Link
              to="/questions?sort=unanswered"
              className="block text-muted hover:text-ink transition-colors"
            >
              Unanswered
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Project</p>
            <Link to="/about" className="block text-muted hover:text-ink transition-colors">
              About
            </Link>
            <Link to="/contact" className="block text-muted hover:text-ink transition-colors">
              Contact
            </Link>
            <a
              href="https://github.com/silv3r1224-ops/Que-swer"
              target="_blank"
              rel="noreferrer"
              className="block text-muted hover:text-ink transition-colors"
            >
              GitHub
            </a>
          </div>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-site py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <p>© {new Date().getFullYear()} Que-swer · NEHU</p>
          <p>Built as an open-source campus project.</p>
        </div>
      </div>
    </footer>
  );
}
