import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, UploadCloud } from 'lucide-react';
import { useCourses, useDepartments, useDeletePaper, usePapers } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';
import { Page } from '@/components/Page';
import { getAccessToken } from '@/lib/api';

function UploadPaperModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const departments = useDepartments();
  const { error, success } = useToast();
  const [departmentId, setDepartmentId] = useState('');
  const courses = useCourses(departmentId || undefined);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [semester, setSemester] = useState(1);
  const [examType, setExamType] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departmentId || files.length === 0) {
      setErr('Title, department and at least one page image/PDF are required.');
      return;
    }
    setErr('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('departmentId', departmentId);
      if (courseId) fd.append('courseId', courseId);
      fd.append('year', String(year));
      fd.append('semester', String(semester));
      if (examType.trim()) fd.append('examType', examType.trim());
      for (const f of files) fd.append('pages', f);

      const res = await fetch('/api/v1/papers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(data?.error?.message ?? 'Upload failed');
      }
      success('Paper uploaded — thanks for contributing!');
      setTitle('');
      setFiles([]);
      setSemester(1);
      onClose();
      onDone();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload a previous-year paper" wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Computer Science — Semester 3 (2024)"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department">
            <Select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId('');
              }}
            >
              <option value="">Select department…</option>
              {departments.data?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course">
            <Select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={!departmentId}
            >
              <option value="">— Optional —</option>
              {courses.data?.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Field label="Year">
            <Input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </Field>
          <Field label="Semester">
            <Select value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam type">
            <Input
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              placeholder="Final / Midterm"
            />
          </Field>
        </div>

        <Field
          label="Pages (JPG / PNG / WebP / PDF)"
          hint="Scanned pages in order — name them page-1.jpg, page-2.jpg, or upload in order."
        >
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-bg px-4 py-8 text-center transition-colors hover:border-accent">
            <UploadCloud className="text-accent" size={28} />
            <span className="text-sm text-muted">Click to choose files</span>
            <span className="text-xs text-muted">up to 10 MB each</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={i} className="chip">
                  {i + 1}. {f.name}
                </span>
              ))}
            </div>
          )}
        </Field>

        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload paper'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Papers() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);

  const page = Number(params.get('page') ?? 1);
  const departmentId = params.get('departmentId') ?? undefined;
  const courseId = params.get('courseId') ?? undefined;
  const year = params.get('year') ? Number(params.get('year')) : undefined;
  const semester = params.get('semester') ? Number(params.get('semester')) : undefined;

  const departments = useDepartments();
  const courses = useCourses(departmentId);
  const query = usePapers({ page, pageSize: 12, departmentId, courseId, year, semester });
  const delPaper = useDeletePaper();
  const { error } = useToast();

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    setParams(next);
  };

  const canUpload = user && user.role !== 'STUDENT';

  // Distinct years available from current page set (fallback: current year)
  const years = query.data
    ? Array.from(new Set(query.data.papers.map((p) => p.year))).sort((a, b) => b - a)
    : [];

  return (
    <Page
      kicker="Library"
      title="Previous-year papers"
      actions={
        canUpload ? (
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud size={16} /> Upload paper
          </Button>
        ) : undefined
      }
    >
      {/* Filters */}
      <div className="card-surface mb-6 flex flex-wrap items-center gap-3 p-4">
        <Select
          value={departmentId ?? ''}
          onChange={(e) =>
            updateParams({ departmentId: e.target.value || undefined, courseId: undefined })
          }
          className="!w-auto !py-1.5 !text-xs"
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
          >
            <option value="">All courses</option>
            {courses.data?.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        )}

        <Select
          value={semester ? String(semester) : ''}
          onChange={(e) => updateParams({ semester: e.target.value || undefined })}
          className="!w-auto !py-1.5 !text-xs"
        >
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </Select>

        <Select
          value={year ? String(year) : ''}
          onChange={(e) => updateParams({ year: e.target.value || undefined })}
          className="!w-auto !py-1.5 !text-xs"
        >
          <option value="">All years</option>
          {[...new Set([year ?? new Date().getFullYear(), ...years])]
            .sort((a, b) => b - a)
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load papers." onRetry={() => query.refetch()} />
      ) : !query.data?.papers.length ? (
        <EmptyState
          title="No papers yet"
          hint="Papers will appear here as they are uploaded."
          icon={<FileText size={36} />}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.papers.map((paper) => (
              <div
                key={paper.id}
                className="card-surface group flex flex-col p-5 transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                    <FileText size={20} />
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                    {paper.year} · Sem {paper.semester}
                  </span>
                </div>

                <h3 className="mt-4 font-semibold leading-snug">
                  <Link
                    to={`/papers/${paper.id}`}
                    className="group-hover:text-accent transition-colors"
                  >
                    {paper.title}
                  </Link>
                </h3>

                <p className="mt-1 text-xs text-muted">
                  {paper.department.name}
                  {paper.course ? ` · ${paper.course.code}` : ''}
                  {paper.examType ? ` · ${paper.examType}` : ''}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-xs text-muted">{paper._count?.pages ?? 0} pages</span>
                  <div className="flex items-center gap-2">
                    {canUpload && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${paper.title}"?`)) {
                            delPaper.mutate(paper.id, {
                              onError: (e) =>
                                error(e instanceof Error ? e.message : 'Delete failed'),
                            });
                          }
                        }}
                        className="text-xs text-muted hover:text-danger transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <Link to={`/papers/${paper.id}`} className="btn-primary !px-3 !py-1.5 !text-xs">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={query.data.meta.totalPages}
            onChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}

      <UploadPaperModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDone={() => query.refetch()}
      />
    </Page>
  );
}
