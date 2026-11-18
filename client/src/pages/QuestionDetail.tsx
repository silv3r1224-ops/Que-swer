import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Flag,
  MessageCircle,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  useAcceptAnswer,
  useAnswerComments,
  useAnswers,
  useCommentOnAnswer,
  useDeleteAnswer,
  useDeleteComment,
  useDeleteQuestion,
  useQuestion,
  useReportItem,
  useToggleBookmark,
  useVote,
} from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Skeleton,
  Tag,
  Textarea,
  Tabs,
} from '@/components/ui';
import { Page } from '@/components/Page';
import { cn, timeAgo } from '@/lib/utils';
import type { Answer, Comment } from '@/lib/types';
import { ApiError } from '@/lib/api';

enum Filter {
  New = 'new',
  Top = 'top',
}

function VoteCluster({
  itemType,
  itemId,
  score,
  myVote,
  onDone,
}: {
  itemType: 'QUESTION' | 'ANSWER';
  itemId: string;
  score: number;
  myVote: 'UP' | 'DOWN' | null;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const vote = useVote(itemType);
  const [pending, setPending] = useState<'UP' | 'DOWN' | null>(null);

  const applyVote = (direction: 'UP' | 'DOWN') => {
    if (!user) {
      navigate('/login', { state: { from: `/questions/${itemId}` } });
      return;
    }
    setPending(direction);
    vote.mutate(
      { itemId, direction },
      {
        onSettled: () => setPending(null),
        onSuccess: () => onDone?.(),
      },
    );
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => applyVote('UP')}
        className={cn(
          'rounded-lg p-1.5 transition-all',
          myVote === 'UP'
            ? 'text-accent bg-accent-soft'
            : 'text-muted hover:bg-accent-soft hover:text-accent',
        )}
        aria-label="Upvote"
      >
        <TrendingUp size={20} />
      </button>
      <span
        className={cn(
          'text-lg font-bold font-display tabular-nums',
          pending && 'animate-[bounce_0.3s]',
        )}
      >
        {score}
      </span>
      <button
        onClick={() => applyVote('DOWN')}
        className={cn(
          'rounded-lg p-1.5 transition-all',
          myVote === 'DOWN'
            ? 'text-danger bg-danger/10'
            : 'text-muted hover:bg-danger/10 hover:text-danger',
        )}
        aria-label="Downvote"
      >
        <TrendingDown size={20} />
      </button>
    </div>
  );
}

function AnswerComments({ answerId }: { answerId: string }) {
  const [open, setOpen] = useState(false);
  const comments = useAnswerComments(answerId);
  const addComment = useCommentOnAnswer(answerId);
  const delComment = useDeleteComment();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await addComment.mutateAsync(text.trim());
      setText('');
      await comments.refetch();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
      >
        <MessageCircle size={13} /> {comments.data?.comments.length ?? 0} comments
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
          {comments.isLoading ? (
            <Skeleton className="h-10" />
          ) : (
            comments.data?.comments.map((c: Comment) => (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    <Link
                      to={`/profile/${c.author.username}`}
                      className="font-medium hover:text-accent"
                    >
                      {c.author.displayName}
                    </Link>{' '}
                    · {timeAgo(c.createdAt)}
                  </p>
                </div>
                {user && (user.role !== 'STUDENT' || user.username === c.author.username) && (
                  <button
                    onClick={() => delComment.mutate(c.id, { onSuccess: () => comments.refetch() })}
                    className="text-muted hover:text-danger transition-colors"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}

          {user ? (
            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                className="!min-h-[44px] !py-2 text-sm"
              />
              <Button size="sm" onClick={() => void post()} disabled={posting || !text.trim()}>
                Post
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted">
              <Link to="/login" className="text-accent hover:underline">
                Log in
              </Link>{' '}
              to comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportButton({
  itemType,
  itemId,
}: {
  itemType: 'QUESTION' | 'ANSWER' | 'COMMENT';
  itemId: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const report = useReportItem();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const submit = async () => {
    try {
      await report.mutateAsync({ itemType, itemId, reason: reason.trim() });
      setOpen(false);
      success('Thanks — our moderators will review it.');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Could not submit report');
    }
  };

  return (
    <>
      <button
        onClick={() =>
          user ? setOpen(true) : navigate('/login', { state: { from: window.location.pathname } })
        }
        className="flex items-center gap-1.5 text-xs text-muted hover:text-warn transition-colors"
      >
        <Flag size={13} /> Report
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Report this content">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Tell us what's wrong — spam, abuse, or academic misconduct.
          </p>
          <Field label="Reason">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reporting this?"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={reason.trim().length < 5 || report.isPending}
            >
              Submit report
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AnswerRow({
  answer,
  questionAuthorId,
  onChanged,
}: {
  answer: Answer;
  questionAuthorId: string;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const accept = useAcceptAnswer();
  const del = useDeleteAnswer();
  const { success } = useToast();

  const canModerate = user && (user.role !== 'STUDENT' || user.username === answer.author.username);
  const canAccept = user && (user.role !== 'STUDENT' || user.username === questionAuthorId);

  return (
    <div className={cn('card-surface p-5', answer.isAccepted && 'border-emerald-400/40')}>
      <div className="flex gap-4">
        <VoteCluster
          itemType="ANSWER"
          itemId={answer.id}
          score={answer.score}
          myVote={null}
          onDone={onChanged}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {answer.isAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                <CheckCircle2 size={13} /> Accepted
              </span>
            )}
            <span className="text-xs text-muted">answered {timeAgo(answer.createdAt)}</span>
          </div>

          <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{answer.body}</div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link to={`/profile/${answer.author.username}`} className="flex items-center gap-2">
              <Avatar name={answer.author.displayName} src={answer.author.avatarUrl} size="sm" />
              <span className="text-sm font-medium">{answer.author.displayName}</span>
              <span className="text-xs text-muted">· {answer.author.reputation} rep</span>
            </Link>

            <div className="flex items-center gap-3 text-xs">
              {canAccept && (
                <button
                  onClick={() =>
                    accept.mutate(answer.id, {
                      onSuccess: () => {
                        onChanged();
                        success(answer.isAccepted ? 'Answer un-accepted' : 'Answer accepted 🎉');
                      },
                    })
                  }
                  className="flex items-center gap-1.5 text-muted hover:text-success transition-colors"
                >
                  <CheckCircle2 size={14} /> {answer.isAccepted ? 'Un-accept' : 'Accept'}
                </button>
              )}
              {canModerate && (
                <button
                  onClick={() => del.mutate(answer.id, { onSuccess: () => onChanged() })}
                  className="flex items-center gap-1.5 text-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <ReportButton itemType="ANSWER" itemId={answer.id} />
            </div>
          </div>

          <AnswerComments answerId={answer.id} />
        </div>
      </div>
    </div>
  );
}

export function QuestionDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const question = useQuestion(id);
  const [sort, setSort] = useState<Filter>(Filter.Top);
  const answers = useAnswers(id, sort);
  const bookmark = useToggleBookmark();
  const delQuestion = useDeleteQuestion();
  const { error, success } = useToast();

  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const refresh = () => {
    question.refetch();
    answers.refetch();
  };

  const submitAnswer = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/questions/${id}` } });
      return;
    }
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/v1/questions/' + id + '/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.status === 401) {
        error('Please log in to answer.');
        navigate('/login', { state: { from: `/questions/${id}` } });
        return;
      }
      if (!res.ok) throw new Error('Failed to post answer');
      setBody('');
      success('Answer posted!');
      await answers.refetch();
      setSort(Filter.New);
    } catch {
      error('Could not post your answer. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const q = useMemo(() => question.data?.question, [question.data]);

  if (question.isLoading) {
    return (
      <div className="container-site pt-8 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (question.isError || !q) {
    return (
      <Page>
        <ErrorState
          message="Question not found or could not be loaded."
          onRetry={() => question.refetch()}
        />
      </Page>
    );
  }

  const canModerateQuestion =
    user && (user.role !== 'STUDENT' || user.username === q.author.username);

  return (
    <Page>
      <article className="max-w-4xl">
        <div className="card-surface p-6 sm:p-8">
          <div className="flex gap-5">
            <VoteCluster
              itemType="QUESTION"
              itemId={q.id}
              score={q.score}
              myVote={q.myVote}
              onDone={() => question.refetch()}
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{q.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                <Link
                  to={`/profile/${q.author.username}`}
                  className="flex items-center gap-2 hover:text-ink transition-colors"
                >
                  <Avatar name={q.author.displayName} src={q.author.avatarUrl} size="sm" />
                  <span className="text-ink font-medium">{q.author.displayName}</span>
                  <span>· {q.author.reputation} rep</span>
                </Link>
                <span>asked {timeAgo(q.createdAt)}</span>
                <span>· {q.views} views</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {q.tags.map((t) => (
                  <Link key={t.slug} to={`/questions?tag=${t.slug}`}>
                    <Tag>#{t.name}</Tag>
                  </Link>
                ))}
                {q.department && (
                  <Tag className="!border-accent/30 !text-accent">{q.department.name}</Tag>
                )}
                {q.course && <Tag>{q.course.code}</Tag>}
              </div>

              <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">{q.body}</div>

              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-4">
                <button
                  onClick={() =>
                    user
                      ? bookmark.mutate(q.id)
                      : navigate('/login', { state: { from: `/questions/${q.id}` } })
                  }
                  className={cn(
                    'flex items-center gap-1.5 text-sm transition-colors',
                    q.bookmarked ? 'text-accent' : 'text-muted hover:text-accent',
                  )}
                >
                  <Bookmark size={15} fill={q.bookmarked ? 'currentColor' : 'none'} />{' '}
                  {q.bookmarked ? 'Saved' : 'Save'}
                </button>
                <ReportButton itemType="QUESTION" itemId={q.id} />
                {canModerateQuestion && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this question permanently?')) {
                        delQuestion.mutate(q.id, {
                          onSuccess: () => navigate('/questions'),
                          onError: (e) =>
                            error(e instanceof ApiError ? e.message : 'Delete failed'),
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Answers */}
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{answers.data?.meta?.total ?? 0} answers</h2>
            <Tabs
              tabs={[
                { value: Filter.Top, label: 'Top' },
                { value: Filter.New, label: 'Newest' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </div>

          {answers.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : answers.data?.answers.length ? (
            <div className="space-y-4">
              {answers.data.answers.map((a) => (
                <AnswerRow
                  key={a.id}
                  answer={a}
                  questionAuthorId={q.author.id}
                  onChanged={refresh}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No answers yet" hint="Be the first to help!" />
          )}
        </section>

        {/* Your answer */}
        <section className="mt-10 card-surface p-6">
          <h2 className="text-lg font-semibold">Your answer</h2>
          {user ? (
            <>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a clear, helpful answer…"
                className="mt-3"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={() => void submitAnswer()} disabled={posting || !body.trim()}>
                  {posting ? 'Posting…' : 'Post answer'}
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              <Link
                to="/login"
                state={{ from: `/questions/${q.id}` }}
                className="text-accent font-medium hover:underline"
              >
                Log in
              </Link>{' '}
              to answer this question.
            </p>
          )}
        </section>
      </article>
    </Page>
  );
}
