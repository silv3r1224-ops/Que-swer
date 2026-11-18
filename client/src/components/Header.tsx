import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MessageSquare, Moon, Plus, Sun, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { Avatar, Dropdown } from './ui';
import { cn } from '@/lib/utils';

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.removeAttribute('data-theme');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem('qs-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className="btn-ghost !p-2"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'text-accent bg-accent-soft' : 'text-muted hover:text-ink',
    );

  return (
    <>
      <NavLink to="/" className={linkClass} end onClick={onNavigate}>
        Home
      </NavLink>
      <NavLink to="/questions" className={linkClass} onClick={onNavigate}>
        Questions
      </NavLink>
      <NavLink to="/papers" className={linkClass} onClick={onNavigate}>
        Papers
      </NavLink>
      <NavLink to="/contact" className={linkClass} onClick={onNavigate}>
        Contact
      </NavLink>
    </>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    apiGet<{ unread: number }>('/api/v1/notifications?pageSize=1')
      .then((data) => {
        if (!cancelled) setUnread(data.unread);
      })
      .catch(() => undefined);
    const t = window.setInterval(() => {
      apiGet<{ unread: number }>('/api/v1/notifications?pageSize=1')
        .then((data) => {
          if (!cancelled) setUnread(data.unread);
        })
        .catch(() => undefined);
    }, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="container-site flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold"
            style={{ background: 'var(--accent)', color: 'var(--ink)' }}
            aria-hidden="true"
          >
            QS
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Que<span className="text-accent">-</span>swer
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {user ? (
            <>
              <Link to="/questions/new" className="btn-primary !px-3 !py-2">
                <Plus size={16} /> <span className="hidden sm:inline">Ask</span>
              </Link>

              <Link
                to="/notifications"
                className="btn-ghost relative !p-2"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>

              <Dropdown
                trigger={
                  <button
                    className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-accent/40 transition-shadow"
                    aria-label="Account menu"
                  >
                    <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
                  </button>
                }
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted">@{user.username}</p>
                </div>
                <div className="my-1 h-px bg-line" />
                <Link
                  to="/profile/me"
                  className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-surface-2"
                >
                  <User size={15} /> My profile
                </Link>
                <button
                  onClick={() => navigate('/contact')}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-surface-2"
                >
                  <MessageSquare size={15} /> Feedback
                </button>
                <button
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-danger hover:bg-danger/10"
                >
                  <LogOut size={15} /> Log out
                </button>
              </Dropdown>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}

          <button
            className="btn-ghost md:hidden !p-2"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="block h-0.5 w-4 bg-current rounded" />
            <span className="mt-1 block h-0.5 w-4 bg-current rounded" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="md:hidden border-t border-line bg-bg p-3 flex flex-col gap-1"
          aria-label="Mobile"
        >
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          {user && (
            <button
              onClick={() => {
                setMobileOpen(false);
                void logout();
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger"
            >
              <LogOut size={15} /> Log out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
