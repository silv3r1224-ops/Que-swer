import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useMarkAllRead, useNotifications } from '@/lib/hooks';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { Page } from '@/components/Page';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function Notifications() {
  const query = useNotifications();
  const markAll = useMarkAllRead();

  return (
    <Page
      kicker="Inbox"
      title="Notifications"
      actions={
        query.data?.unread ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAll.mutate(undefined, { onSuccess: () => query.refetch() })}
          >
            <CheckCheck size={15} /> Mark all read
          </Button>
        ) : undefined
      }
      className="max-w-3xl"
    >
      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load notifications." onRetry={() => query.refetch()} />
      ) : !query.data?.notifications.length ? (
        <EmptyState
          title="All caught up"
          hint="You'll be notified about answers and activity."
          icon={<Bell size={36} />}
        />
      ) : (
        <div className="space-y-2.5">
          {query.data.notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'card-surface flex items-start gap-4 p-4',
                !n.readAt && 'border-accent/40',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  n.readAt ? 'bg-line' : 'bg-accent',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {n.actor && <>{n.actor.displayName} · </>}
                  {timeAgo(n.createdAt)}
                </p>
                {n.question && (
                  <Link
                    to={`/questions/${n.question.id}`}
                    className="mt-1.5 inline-block text-sm text-accent hover:underline"
                  >
                    {n.question.title}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
