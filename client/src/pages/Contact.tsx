import { useState, type FormEvent } from 'react';
import { useToast } from '@/lib/toast';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { Page } from '@/components/Page';
import { apiPost } from '@/lib/api';
import { ApiError } from '@/lib/api';

export function Contact() {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiPost('/api/v1/messages', { name, email, subject, body });
      success('Message sent — we read everything.');
      setName('');
      setEmail('');
      setSubject('');
      setBody('');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Page kicker="Say hello" title="Contact" className="max-w-2xl">
      <form onSubmit={submit} className="card-surface space-y-4 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={sending}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sending}
            />
          </Field>
        </div>
        <Field label="Subject">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Feedback, papers, moderation…"
          />
        </Field>
        <Field label="Message">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={sending}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </form>
    </Page>
  );
}
