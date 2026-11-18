import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, MessageCircle, User as UserIcon } from 'lucide-react';
import { useMyActivity, useMyBookmarks } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Avatar, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { Page } from '@/components/Page';
import { apiGet } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { UserSummary } from '@/lib/types';

interface PublicProfile extends UserSummary {
  bio?: string | null;
  createdAt: string;
  _count: { questions: number; answers: number };
}

export function Profile() {
  const { username = '' } = useParams();
  const { user: me } = useAuth();
  const isMe = username === 'me' || (me && username === me.username);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileState, setProfileState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!isMe) {
      setProfileState('loading');
      apiGet<{ user: PublicProfile }>(`/api/v1/users/${encodeURIComponent(username)}`)
        .then((d) => {
          setProfile(d.user);
          setProfileState('ready');
        })
        .catch(() => setProfileState('error'));
    } else if (me) {
      setProfile({
        id: me.id,
        username: me.username,
        displayName: me.displayName,
        reputation: me.reputation,
        avatarUrl: me.avatarUrl,
        role: me.role,
        bio: me.bio,
        createdAt: me.createdAt,
        _count: { questions: 0, answers: 0 },
      });
      setProfileState('ready');
    }
  }, [username, isMe, me]);

  const myBookmarks = useMyBookmarks();
  const myActivity = useMyActivity();

  if (profileState === 'loading') {
    return (
      <Page>
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-40" />
        </div>
      </Page>
    );
  }

  if (profileState === 'error' || !profile) {
    return (
      <Page>
        <ErrorState message="User not found." />
      </Page>
    );
  }

  return (
    <Page className="max-w-4xl">
      {/* Profile card */}
      <div className="card-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {!isMe && <span className="text-sm text-muted">@{profile.username}</span>}
              {profile.role && profile.role !== 'STUDENT' && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                  {profile.role === 'ADMIN' ? 'Admin' : 'Moderator'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {profile.reputation} reputation · {profile._count.questions} questions ·{' '}
              {profile._count.answers} answers
            </p>
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {isMe && (
        <>
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Bookmark size={18} className="text-accent" /> Saved questions
            </h2>
            {myBookmarks.isLoading ? (
              <Skeleton className="h-32" />
            ) : myBookmarks.data?.bookmarks.length ? (
              <div className="space-y-2.5">
                {myBookmarks.data.bookmarks.map((b) => (
                  <Link
                    key={b.id}
                    to={`/questions/${b.question.id}`}
                    className="card-surface group block p-4 hover:shadow-glow transition-shadow"
                  >
                    <p className="font-medium group-hover:text-accent transition-colors">
                      {b.question.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">saved {timeAgo(b.createdAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved questions"
                hint="Bookmark questions you want to come back to."
                icon={<Bookmark size={36} />}
              />
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <MessageCircle size={18} className="text-accent" /> My activity
            </h2>
            {myActivity.isLoading ? (
              <Skeleton className="h-32" />
            ) : myActivity.data?.questions.length || myActivity.data?.answers.length ? (
              <div className="space-y-2.5">
                {myActivity.data!.questions.slice(0, 10).map((q) => (
                  <Link
                    key={q.id}
                    to={`/questions/${q.id}`}
                    className="card-surface group flex items-center justify-between gap-3 p-4 hover:shadow-glow transition-shadow"
                  >
                    <span className="font-medium truncate group-hover:text-accent transition-colors">
                      {q.title}
                    </span>
                    <span className="text-xs text-muted shrink-0">{timeAgo(q.createdAt)}</span>
                  </Link>
                ))}
                {myActivity.data!.answers.slice(0, 10).map((a) => (
                  <Link
                    key={a.id}
                    to={`/questions/${a.question.id}`}
                    className="card-surface group flex items-center justify-between gap-3 p-4 hover:shadow-glow transition-shadow"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-xs text-muted">answered</span>
                      <span className="font-medium truncate group-hover:text-accent transition-colors">
                        {a.question.title}
                      </span>
                    </span>
                    <span className="text-xs text-muted shrink-0">{timeAgo(a.createdAt)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                hint="Ask or answer your first question!"
                icon={<UserIcon size={36} />}
              />
            )}
          </section>
        </>
      )}
    </Page>
  );
}
