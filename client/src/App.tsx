import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { Layout } from '@/components/Layout';
import { Skeleton } from '@/components/ui';

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })));
const Questions = lazy(() => import('@/pages/Questions').then((m) => ({ default: m.Questions })));
const QuestionDetail = lazy(() =>
  import('@/pages/QuestionDetail').then((m) => ({ default: m.QuestionDetail })),
);
const Ask = lazy(() => import('@/pages/Ask').then((m) => ({ default: m.Ask })));
const Papers = lazy(() => import('@/pages/Papers').then((m) => ({ default: m.Papers })));
const PaperViewer = lazy(() =>
  import('@/pages/PaperViewer').then((m) => ({ default: m.PaperViewer })),
);
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })));
const Notifications = lazy(() =>
  import('@/pages/Notifications').then((m) => ({ default: m.Notifications })),
);
const Contact = lazy(() => import('@/pages/Contact').then((m) => ({ default: m.Contact })));
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="container-site pt-8 space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? '/questions' : '/'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route
                    path="/questions/new"
                    element={
                      <Protected>
                        <Ask />
                      </Protected>
                    }
                  />
                  <Route path="/questions/:id" element={<QuestionDetail />} />
                  <Route path="/papers" element={<Papers />} />
                  <Route path="/papers/:id" element={<PaperViewer />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route
                    path="/notifications"
                    element={
                      <Protected>
                        <Notifications />
                      </Protected>
                    }
                  />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/redirect" element={<RootRedirect />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
