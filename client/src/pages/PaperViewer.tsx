import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { usePaper } from '@/lib/hooks';
import { Button, ErrorState, Skeleton } from '@/components/ui';
import { Page } from '@/components/Page';
import { cn } from '@/lib/utils';

export function PaperViewer() {
  const { id = '' } = useParams();
  const paper = usePaper(id);
  const [pageIdx, setPageIdx] = useState(0);

  if (paper.isLoading) {
    return (
      <div className="container-site pt-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[70vh]" />
      </div>
    );
  }

  if (paper.isError || !paper.data) {
    return (
      <Page>
        <ErrorState
          message="Paper not found or could not be loaded."
          onRetry={() => paper.refetch()}
        />
      </Page>
    );
  }

  const p = paper.data.paper;
  const pages = p.pages;
  const current = pages[pageIdx];
  const isPdf = current?.mimeType === 'application/pdf';

  return (
    <Page>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/papers" className="text-sm text-muted hover:text-accent transition-colors">
              ← All papers
            </Link>
            <h1 className="mt-1 text-2xl font-bold">{p.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {p.department.name}
              {p.course ? ` · ${p.course.code} — ${p.course.name}` : ''}
              {p.examType ? ` · ${p.examType}` : ''} · {p.year} · Semester {p.semester}
            </p>
          </div>
          {pages.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pageIdx === 0}
                onClick={() => setPageIdx((i) => i - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm tabular-nums text-muted">
                {pageIdx + 1} / {pages.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pageIdx >= pages.length - 1}
                onClick={() => setPageIdx((i) => i + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Page viewer */}
        <div className="card-surface overflow-hidden p-3 sm:p-6">
          {!current ? (
            <div className="py-20 text-center text-muted">
              <FileText className="mx-auto mb-3" size={40} />
              <p>No pages uploaded for this paper yet.</p>
            </div>
          ) : isPdf ? (
            <iframe
              src={`/api/v1/papers/${p.id}/files/${current.pageNo}`}
              title={`${p.title} — page ${current.pageNo}`}
              className="h-[75vh] w-full rounded-md border border-line bg-bg"
            />
          ) : (
            <img
              src={`/api/v1/papers/${p.id}/files/${current.pageNo}`}
              alt={`${p.title} — page ${current.pageNo}`}
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-md shadow-card"
              loading={pageIdx === 0 ? 'eager' : 'lazy'}
            />
          )}
        </div>

        {/* Page thumbnails */}
        {pages.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {pages.map((pg, i) => (
              <button
                key={pg.id}
                onClick={() => setPageIdx(i)}
                className={cn(
                  'shrink-0 rounded-md border-2 p-1 transition-all',
                  i === pageIdx
                    ? 'border-accent bg-accent-soft'
                    : 'border-line hover:border-accent/50',
                )}
                aria-label={`Go to page ${pg.pageNo}`}
              >
                <img
                  src={`/api/v1/papers/${p.id}/files/${pg.pageNo}`}
                  alt=""
                  className="h-16 w-12 object-cover rounded-sm"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Uploaded by <span className="font-medium text-ink">{p.uploadedBy.displayName}</span> · ©
          NEHU — for study purposes.
        </p>
      </div>
    </Page>
  );
}
