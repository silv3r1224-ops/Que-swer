import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from './utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast,
      success: (m: string) => toast('success', m),
      error: (m: string) => toast('error', m),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                'card-surface flex items-start gap-3 px-4 py-3 text-sm animate-[toast-in_0.28s_var(--ease-out)]',
                t.kind === 'success' && 'border-emerald-400/40',
                t.kind === 'error' && 'border-red-400/40',
              )}
              style={{ animationName: 'toast-in' }}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-[18px] w-[18px] shrink-0',
                  t.kind === 'success' && 'text-success',
                  t.kind === 'error' && 'text-danger',
                  t.kind === 'info' && 'text-accent',
                )}
                size={18}
              />
              <span className="flex-1 leading-snug text-ink">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted hover:text-ink transition-colors"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
