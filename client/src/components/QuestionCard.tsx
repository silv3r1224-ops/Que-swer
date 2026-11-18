import { Link } from 'react-router-dom';
import { MessageCircle, Eye } from 'lucide-react';
import type { QuestionListItem } from '@/lib/types';
import { Avatar, Tag } from './ui';
import { formatNumber, timeAgo } from '@/lib/utils';

export function QuestionCard({ question }: { question: QuestionListItem }) {
  return (
    <article className="card-surface group p-5 transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Score block */}
        <div className="hidden sm:flex flex-col items-center gap-0.5 w-14 shrink-0">
          <span className="text-lg font-bold font-display text-accent">
            {formatNumber(question.score)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted">votes</span>
          <span className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <MessageCircle size={12} /> {question._count.answers}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug group-hover:text-accent transition-colors">
            <Link to={`/questions/${question.id}`}>{question.title}</Link>
          </h2>

          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{question.body}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex flex-wrap gap-1.5">
              {question.tags.slice(0, 4).map((t) => (
                <Link key={t.slug} to={`/questions?tag=${t.slug}`}>
                  <Tag>#{t.name}</Tag>
                </Link>
              ))}
            </div>

            {question.course && (
              <span className="text-xs text-muted">
                {question.course.code}
                {question.department ? ` · ${question.department.name}` : ''}
              </span>
            )}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-line pt-3">
            <Link
              to={`/profile/${question.author.username}`}
              className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors"
            >
              <Avatar
                name={question.author.displayName}
                src={question.author.avatarUrl}
                size="sm"
              />
              <span className="font-medium">{question.author.displayName}</span>
              <span className="text-muted/70">· {question.author.reputation} rep</span>
            </Link>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {formatNumber(question.views)}
              </span>
              <span className="sm:hidden">{question._count.answers} answers</span>
              <time dateTime={question.createdAt}>{timeAgo(question.createdAt)}</time>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
