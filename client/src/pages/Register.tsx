import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Button, Field, Input } from '@/components/ui';
import { ApiError } from '@/lib/api';

const schema = z
  .object({
    displayName: z.string().min(1, 'Display name is required').max(60),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-zA-Z]/, 'Must include a letter')
      .regex(/\d/, 'Must include a number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export function Register() {
  const { register } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path[0] as keyof FormValues] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({
        email: values.email,
        username: values.username,
        displayName: values.displayName,
        password: values.password,
      });
      navigate('/');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-site flex min-h-[70vh] items-center justify-center py-12">
      <div className="card-surface w-full max-w-md p-8">
        <p className="kicker">Join the community</p>
        <h1 className="mt-1.5 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Open to all — free forever.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Full name" error={fieldErrors.displayName}>
            <Input
              value={values.displayName}
              onChange={set('displayName')}
              placeholder="Rita Sharma"
              autoComplete="name"
              required
            />
          </Field>

          <Field
            label="Username"
            error={fieldErrors.username}
            hint="Lowercase letters, numbers, underscores."
          >
            <Input
              value={values.username}
              onChange={set('username')}
              placeholder="rita_sharma"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Email" error={fieldErrors.email}>
            <Input
              type="email"
              value={values.email}
              onChange={set('email')}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field
            label="Password"
            error={fieldErrors.password}
            hint="Min 8 chars, letters + numbers."
          >
            <Input
              type="password"
              value={values.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>

          <Field label="Confirm password" error={fieldErrors.confirm}>
            <Input
              type="password"
              value={values.confirm}
              onChange={set('confirm')}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
