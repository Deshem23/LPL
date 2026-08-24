'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Home } from 'lucide-react';

interface ContactPageProps {
  params: { locale: string };
}

// Was a static <form> with no onSubmit/action at all - clicking "Send
// Message" did nothing but reload the page. Now posts to /api/contact,
// which emails the submission through the SMTP settings in
// Settings > Email (see src/lib/email/mailer.ts).
export default function ContactPage({ params }: ContactPageProps) {
  const { locale } = params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Une erreur est survenue. Réessayez plus tard.");
      }
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Une erreur est survenue. Réessayez plus tard.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold">Message envoyé</h1>
        <p className="mt-2 text-muted-foreground">
          Merci de nous avoir contactés, nous vous répondrons dès que possible.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {/* Plain <a>, not next/link's <Link> - home is a force-dynamic
              page whose "Dernières actualités"/"À la une"/"Tendances"
              sections were going stale on a soft <Link> navigation
              (client Router Cache), same issue already fixed elsewhere
              (footer, mobile menu). */}
          <a
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </a>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="rounded-lg border px-6 py-2 text-sm hover:bg-muted"
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-4xl font-bold mb-6">Contactez-nous</h1>
      <p className="text-muted-foreground mb-8">
        Une question ou un commentaire ? Nous serions ravis de vous lire.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Nom</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
            placeholder="Votre nom"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
            placeholder="votre@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
            placeholder="Votre message..."
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer le message
        </button>
      </form>
    </div>
  );
}
