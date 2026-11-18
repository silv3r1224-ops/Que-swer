import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses, useDepartments, useAskQuestion } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Page } from '@/components/Page';
import { ApiError } from '@/lib/api';

export function Ask() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error, success } = useToast();
  const ask = useAskQuestion();

  const departments = useDepartments();
  const [departmentId, setDepartmentId] = useState('');
  const courses = useCourses(departmentId || undefined);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const addTag = () => {
    const t = tagInput
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 10) {
      setFormError('Title must be at least 10 characters.');
      return;
    }
    if (body.trim().length < 5) {
      setFormError('Please write some detail in the question body.');
      return;
    }
    setFormError('');
    try {
      const data = await ask.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        departmentId: departmentId || undefined,
        courseId: courseId || undefined,
        tags,
      });
      success('Question posted!');
      navigate(`/questions/${data.question.id}`);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Could not post the question');
    }
  };

  if (!user) {
    return (
      <Page title="Ask a question">
        <div className="card-surface p-10 text-center">
          <p className="text-muted">
            Please{' '}
            <a href="/login" className="text-accent font-medium hover:underline">
              log in
            </a>{' '}
            to ask a question.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page kicker="Share knowledge" title="Ask a question" className="max-w-3xl">
      <form onSubmit={submit} className="card-surface space-y-5 p-6 sm:p-8" noValidate>
        <Field
          label="Title"
          hint="Summarize your question in one sentence."
          error={formError && title.trim().length < 10 ? formError : undefined}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How does Bernoulli's equation apply to lift?"
            maxLength={200}
          />
        </Field>

        <Field label="Details" hint="Add context, what you've tried, and expected answer format.">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your full question here…"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Department">
            <Select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId('');
              }}
            >
              <option value="">— None —</option>
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
              <option value="">— None —</option>
              {courses.data?.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tags" hint="Up to 8. Press Enter to add.">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-bg px-3 py-2 focus-within:border-accent focus-within:shadow-glow transition-all">
            {tags.map((t) => (
              <span key={t} className="chip chip-active">
                #{t}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
              placeholder={tags.length ? '' : 'e.g. physics'}
              className="min-w-[90px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Add tag"
            />
          </div>
        </Field>

        {formError && !(title.trim().length < 10) && (
          <p className="text-sm text-danger">{formError}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={ask.isPending}>
            {ask.isPending ? 'Posting…' : 'Post question'}
          </Button>
        </div>
      </form>
    </Page>
  );
}
