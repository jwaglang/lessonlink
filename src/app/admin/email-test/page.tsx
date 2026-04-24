'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, CheckCircle2, XCircle, Mail } from 'lucide-react';
import PageHeader from '@/components/page-header';

const TEMPLATES = [
  { value: 'ping', label: 'Ping (basic delivery test)' },
  { value: 'homework-assignment', label: 'Homework Assignment' },
  { value: 'homework-graded', label: 'Homework Graded' },
  { value: 'session-feedback', label: 'Session Feedback' },
  { value: 'parent-report-initial', label: 'Parent Report — Initial Assessment' },
  { value: 'parent-report-final', label: 'Parent Report — Final Evaluation' },
  { value: 'session-reminder', label: 'Session Reminder' },
];

interface SendResult {
  ok: boolean;
  subject?: string;
  id?: string;
  error?: string;
}

export default function EmailTestPage() {
  const [to, setTo] = useState('');
  const [template, setTemplate] = useState('ping');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  async function handleSend() {
    if (!to.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), template }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ ok: true, subject: data.subject, id: data.id });
      } else {
        setResult({ ok: false, error: data.error ?? 'Unknown error' });
      }
    } catch (err: any) {
      setResult({ ok: false, error: err.message ?? 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Email Test"
        description="Send a test email to verify delivery for any address, including kiddoland.co."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Choose a template and recipient. All emails are sent from{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              notifications@updates.kiddoland.co
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient address</Label>
            <Input
              id="to"
              type="email"
              placeholder="e.g. payments@kiddoland.co"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All templates use sample data (learner: Tommy, teacher: Jon).
            </p>
          </div>

          <Button onClick={handleSend} disabled={loading || !to.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>

          {result && (
            <div
              className={`flex items-start gap-3 rounded-lg p-4 text-sm ${
                result.ok
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-600" />
              )}
              <div className="space-y-1">
                {result.ok ? (
                  <>
                    <p className="font-medium">Sent successfully</p>
                    {result.subject && (
                      <p className="text-xs opacity-80">Subject: {result.subject}</p>
                    )}
                    {result.id && (
                      <p className="text-xs opacity-80 font-mono">Resend ID: {result.id}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium">Failed to send</p>
                    <p className="text-xs opacity-80">{result.error}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
