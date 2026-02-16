'use client';

import { useState } from 'react';
import type { Student, ParentContact, MessagingContact } from '@/lib/types';
import { updateStudent } from '@/lib/firestore';
import {
  RELATIONSHIP_OPTIONS,
  ENGLISH_PROFICIENCY_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  MESSAGING_APPS,
  calculateAge,
} from '@/lib/dragon-levels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Pencil, Save, X, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface ParentInfoSectionProps {
  student: Student;
  studentId: string;
  isAdmin: boolean;
  onStudentUpdate?: (updated: Student) => void;
}

const emptyParent: ParentContact = {
  name: '',
  email: '',
  phone: '',
  relationship: 'mother',
  country: '',
  city: '',
  messaging: [],
  preferredContactMethod: 'email',
  profession: '',
  englishProficiency: 'none',
};

export default function ParentInfoSection({ student, studentId, isAdmin, onStudentUpdate }: ParentInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primary, setPrimary] = useState<ParentContact>(student.primaryContact ?? { ...emptyParent });
  const [secondary, setSecondary] = useState<ParentContact>(student.secondaryContact ?? { ...emptyParent, relationship: 'father' });

  const isUnder18 = student.birthday ? calculateAge(student.birthday) < 18 : false;
  const hasPrimaryData = student.primaryContact && student.primaryContact.name;

  function handleCancel() {
    setPrimary(student.primaryContact ?? { ...emptyParent });
    setSecondary(student.secondaryContact ?? { ...emptyParent, relationship: 'father' });
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Partial<Student> = {
        primaryContact: primary.name ? primary : null,
        secondaryContact: secondary.name ? secondary : null,
      };
      const updated = await updateStudent(studentId, updates);
      onStudentUpdate?.(updated);
      setEditing(false);
    } catch (err) {
      console.error('Error saving parent info:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Parent Information
            </CardTitle>
            {isUnder18 && !hasPrimaryData && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" /> Required (under 18)
              </span>
            )}
            {!isUnder18 && (
              <span className="text-xs text-muted-foreground">(Optional)</span>
            )}
          </div>
          {isAdmin && !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {editing ? (
          <div className="space-y-8">
            <ParentForm label="Primary Contact" parent={primary} onChange={setPrimary} />
            <ParentForm label="Secondary Contact" parent={secondary} onChange={setSecondary} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ParentView label="Primary Contact" parent={student.primaryContact} />
            <ParentView label="Secondary Contact" parent={student.secondaryContact} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Parent View (read-only) ── */

function ParentView({ label, parent }: { label: string; parent?: ParentContact }) {
  if (!parent || !parent.name) {
    return (
      <div>
        <p className="text-sm font-semibold mb-2">{label}</p>
        <p className="text-sm text-muted-foreground">Not provided</p>
      </div>
    );
  }

  const relLabel = RELATIONSHIP_OPTIONS.find((r) => r.value === parent.relationship)?.label ?? parent.relationship;
  const profLabel = ENGLISH_PROFICIENCY_OPTIONS.find((p) => p.value === parent.englishProficiency)?.label ?? parent.englishProficiency;
  const contactLabel = CONTACT_METHOD_OPTIONS.find((c) => c.value === parent.preferredContactMethod)?.label ?? parent.preferredContactMethod;

  return (
    <div>
      <p className="text-sm font-semibold mb-3">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Name" value={parent.name} />
        <Field label="Relationship" value={relLabel ?? '—'} />
        <Field label="Email" value={parent.email || '—'} />
        <Field label="Phone" value={parent.phone || '—'} />
        <Field label="Country" value={parent.country || '—'} />
        <Field label="City" value={parent.city || '—'} />
        <Field label="Preferred Contact" value={contactLabel ?? '—'} />
        <Field label="Profession" value={parent.profession || '—'} />
        <Field label="English Proficiency" value={profLabel ?? '—'} />
        {parent.messaging && parent.messaging.length > 0 && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Messaging</p>
            <div className="mt-1 space-y-1">
              {parent.messaging.map((m, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium">{getAppLabel(m.app)}:</span> {m.handle}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Parent Form (edit mode) ── */

function ParentForm({
  label,
  parent,
  onChange,
}: {
  label: string;
  parent: ParentContact;
  onChange: (p: ParentContact) => void;
}) {
  function update(field: string, value: any) {
    onChange({ ...parent, [field]: value });
  }

  function addMessaging() {
    const msgs = [...(parent.messaging ?? []), { app: 'whatsapp', handle: '' }];
    onChange({ ...parent, messaging: msgs });
  }

  function removeMessaging(index: number) {
    const msgs = (parent.messaging ?? []).filter((_, i) => i !== index);
    onChange({ ...parent, messaging: msgs });
  }

  function updateMessaging(index: number, field: keyof MessagingContact, value: string) {
    const msgs = [...(parent.messaging ?? [])];
    msgs[index] = { ...msgs[index], [field]: value };
    onChange({ ...parent, messaging: msgs });
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-3">{label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
          <Input value={parent.name} onChange={(e) => update('name', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Relationship</label>
          <select
            value={parent.relationship}
            onChange={(e) => update('relationship', e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
          <Input value={parent.email} onChange={(e) => update('email', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</label>
          <Input value={parent.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</label>
          <Input value={parent.country ?? ''} onChange={(e) => update('country', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
          <Input value={parent.city ?? ''} onChange={(e) => update('city', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred Contact Method</label>
          <select
            value={parent.preferredContactMethod ?? ''}
            onChange={(e) => update('preferredContactMethod', e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {CONTACT_METHOD_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profession</label>
          <Input value={parent.profession ?? ''} onChange={(e) => update('profession', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">English Proficiency</label>
          <select
            value={parent.englishProficiency ?? ''}
            onChange={(e) => update('englishProficiency', e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {ENGLISH_PROFICIENCY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parent Messaging */}
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Messaging</p>
        <div className="space-y-2">
          {(parent.messaging ?? []).map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={m.app}
                onChange={(e) => updateMessaging(i, 'app', e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-40"
              >
                {MESSAGING_APPS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <Input
                value={m.handle}
                onChange={(e) => updateMessaging(i, 'handle', e.target.value)}
                placeholder="Handle..."
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => removeMessaging(i)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMessaging}>
            <Plus className="mr-1 h-3 w-3" /> Add Messaging
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function getAppLabel(app: string): string {
  return MESSAGING_APPS.find((a) => a.value === app)?.label ?? app;
}
