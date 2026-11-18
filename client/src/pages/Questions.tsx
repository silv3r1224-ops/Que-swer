import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Plus, Search, X } from 'lucide-react';
import { useCourses, useDepartments, useQuestions, useTags } from '@/lib/hooks';
import { QuestionCard } from '@/components/QuestionCard';
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  QuestionCardSkeleton,
  Select,
  Tabs,
} from '@/components/ui';
import { Page } from '@/components/Page';

type SortKey = 'new' | 'top' | 'unanswered' | 'old';

export function Questions() {
  const [params, setParams] = useSearchParams();
  const [qInput, setQInput] = useState(params.get('q') ?? '');

  const page = Number(params.get('page') ?? 1);
  const sort = (params.get('sort') as SortKey | null) ?? 'new';
  const departmentId = params.get('departmentId') ?? undefined;
  const courseId = params.get('courseId') ?? undefined;
  const tag = params.get('tag') ?? undefined;
  const q = params.get('q') ?? undefined;

  const departments = useDepartments();
  const courses = useCourses(departmentId);
  const tags = useTags();

  const query = useQuestions({ page, pageSize: 10, sort, departmentId, courseId, tag, q });

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    setParams(next);
  };

  const sortTabs: { value: SortKey; label: string }[] = [
    { value: 'new', label: 'Newest' },
    { value: 'top', label: 'Top' },
    { value: 'unanswered', label: 'Unanswered' },
    { value: 'old', label: 'Oldest' },
  ];

  const activeFilters = useMemo(
    () => ({ sort, departmentId, courseId, tag: tag ?? '', q: q ?? '' }),
    [sort, departmentId, courseId, tag, q],
  );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: qInput.trim() || undefined });
  };

  return (
    <Page
      kicker="Community"
      title="Questions"
      actions={
        <Link to="/questions/new" className="btn-primary">
          <Plus size={16} /> Ask a question
        </Link>
      }
    >
      {/* Toolbar */}
      <div className="card-surface mb-6 p-4 space-y-4">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-bg px-3">
            <Search size={16} className="text-muted" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search questions…"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
              aria-label="Search questions"
            />
            {qInput && (
              <button
                type="button"
                onClick={() => {
                  setQInput('');
                  updateParams({ q: undefined });
                }}
                className="text-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Filter size={14} /> Filters
          </div>

          <Select
            value={departmentId ?? ''}
            onChange={(e) =>
              updateParams({ departmentId: e.target.value || undefined, courseId: undefined })
            }
            className="!w-auto !py-1.5 !text-xs"
            aria-label="Department"
          >
            <option value="">All departments</option>
            {departments.data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          {departmentId && (
            <Select
              value={courseId ?? ''}
              onChange={(e) => updateParams({ courseId: e.target.value || undefined })}
              className="!w-auto !py-1.5 !text-xs"
              aria-label="Course"
            >
              <option value="">All courses</option>
              {courses.data?.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          )}

          {activeFilters.tag && (
            <button onClick={() => updateParams({ tag: undefined })} className="chip chip-active">
              #{activeFilters.tag} <X size={12} />
            </button>
          )}

          <div className="ml-auto">
            <Tabs tabs={sortTabs} value={sort} onChange={(v) => updateParams({ sort: v })} />
          </div>
        </div>
      </div>

      {/* List */}
      {query.isLoading ? (
        <div className="space-y-4">
          <QuestionCardSkeleton />
          <QuestionCardSkeleton />
          <QuestionCardSkeleton />
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load questions." onRetry={() => query.refetch()} />
      ) : !query.data?.questions.length ? (
        <EmptyState
          title="No questions found"
          hint="Try adjusting filters or search — or ask the first question!"
          icon={<Search size={36} />}
        />
      ) : (
        <>
          <div className="space-y-4">
            {query.data.questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={query.data.meta.totalPages}
            onChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}

      {/* Tag cloud */}
      {tags.data && tags.data.tags.length > 0 && (
        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Popular tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.data.tags.slice(0, 18).map((t) => (
              <button key={t.slug} onClick={() => updateParams({ tag: t.slug })} className="chip">
                #{t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
