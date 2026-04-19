'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function ContactForm({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    const res = await fetch('/api/email/send-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Something went wrong. Please try again.');
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) { setSent(false); setSending(false); setError(''); setName(''); setEmail(''); setMessage(''); }
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center">Get in Touch</DialogTitle>
          <DialogDescription className="text-center">
            Have a question? Send us a message and we'll get back to you.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-4xl">✉️</p>
            <p className="font-headline font-bold text-lg">Message sent!</p>
            <p className="text-muted-foreground text-sm">We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="contact-name">Your name</Label>
              <Input id="contact-name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact-message">Message</Label>
              <textarea
                id="contact-message"
                rows={4}
                placeholder="Tell us about your child and what you're looking for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={sending} className="w-full font-headline">
              {sending ? 'Sending…' : 'Send Message ✉️'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ContactFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Get in touch"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Mail className="h-6 w-6" />
      </button>
      <ContactForm open={open} setOpen={setOpen} />
    </>
  );
}

export function ContactButton({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size={size} variant="outline" onClick={() => setOpen(true)} className="font-headline border-primary/40 hover:border-primary">
        <Mail className="h-4 w-4 mr-2" />
        Get in Touch
      </Button>
      <ContactForm open={open} setOpen={setOpen} />
    </>
  );
}
